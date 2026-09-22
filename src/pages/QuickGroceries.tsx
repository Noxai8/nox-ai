import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type GroceryItem = {
  name: string;
  qty: string;
  category: string;
  note?: string;

  price?: number | null;
  priceSource?: string;

  imageUrl?: string;
  barcode?: string;
  brand?: string;
  priceDate?: string;

  productTitle?: string;
  packaging?: string;
};

const norm = (v: string) =>
  String(v || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const words = (v: string) =>
  norm(v)
    .split(" ")
    .filter((x) => x.length > 2);

const GENERIC_WORDS = new Set([
  "frais",
  "fraiche",
  "bio",
  "nature",
  "aliment",
  "produit",
  "paquet",
  "boite",
  "sachet",
  "bocal",
  "conserve",
  "entier",
  "entiere",
  "filet",
  "filets",
]);

function usefulWords(v: string) {
  return words(v).filter((x) => !GENERIC_WORDS.has(x));
}

function productScore(wanted: string, title: string) {
  const wantedWords = usefulWords(wanted);
  const titleWords = new Set(usefulWords(title));

  if (!wantedWords.length || !titleWords.size) return 0;

  const matches = wantedWords.filter((word) => {
    if (titleWords.has(word)) return true;

    // petite tolérance singulier/pluriel
    if (word.endsWith("s") && titleWords.has(word.slice(0, -1))) return true;
    if (titleWords.has(`${word}s`)) return true;

    return false;
  }).length;

  let score = matches / wantedWords.length;

  const nw = norm(wanted);
  const nt = norm(title);

  if (nt === nw) score += 0.25;
  else if (nt.includes(nw)) score += 0.15;

  return Math.min(score, 1.25);
}

function priceOf(p: any): number | null {
  const candidates = [
    p?.price,
    p?.price?.amount,
    p?.price?.value,
    p?.current_price,
    p?.current_price?.amount,
  ];

  for (const value of candidates) {
    const n = typeof value === "number" ? value : Number(value);

    if (Number.isFinite(n) && n > 0) {
      return n;
    }
  }

  return null;
}

function imageOf(p: any): string | undefined {
  const candidates = [
    p?.image_url,
    p?.imageUrl,
    p?.image,
    p?.product?.image_url,
    p?.product?.imageUrl,
    p?.product?.image,
    p?.images?.[0]?.url,
    p?.images?.[0],
  ];

  return candidates.find(
    (x) => typeof x === "string" && /^https?:\/\//.test(x)
  );
}

/* =========================================================
   ENSEIGNES
========================================================= */

function isCarrefour(store: string) {
  const s = norm(store);

  return (
    s === "carrefour" ||
    s === "carrefour market" ||
    s.includes("carrefour market")
  );
}

function storeAliases(store: string) {
  const s = norm(store);

  if (s.includes("leclerc")) {
    return ["e leclerc", "leclerc", "e.leclerc"];
  }

  if (s.includes("intermarche")) {
    return ["intermarche", "intermarché"];
  }

  if (s.includes("auchan")) {
    return ["auchan"];
  }

  if (s === "lidl" || s.includes("lidl")) {
    return ["lidl"];
  }

  if (s === "aldi" || s.includes("aldi")) {
    return ["aldi"];
  }

  if (
    s.includes("super u") ||
    s.includes("hyper u") ||
    s.includes("u express")
  ) {
    return ["super u", "hyper u", "u express", "magasins u"];
  }

  if (s.includes("monoprix")) {
    return ["monoprix"];
  }

  if (s.includes("franprix")) {
    return ["franprix"];
  }

  if (s.includes("netto")) {
    return ["netto"];
  }

  if (s.includes("match")) {
    return ["match"];
  }

  if (s.includes("grand frais")) {
    return ["grand frais"];
  }

  if (s.includes("casino")) {
    return ["casino"];
  }

  return [s].filter(Boolean);
}

function sameStore(
  selectedStore: string,
  location: any
) {
  const aliases = storeAliases(selectedStore);

  const haystack = norm(
    [
      location?.osm_name,
      location?.osm_brand,
      location?.osm_display_name,
      location?.name,
      location?.brand,
    ]
      .filter(Boolean)
      .join(" ")
  );

  if (!haystack) return false;

  return aliases.some((alias) =>
    haystack.includes(norm(alias))
  );
}

/* =========================================================
   CARREFOUR — REEFAPI
   INCHANGÉ DANS SON PRINCIPE
========================================================= */

async function enrichCarrefour(
  apiKey: string,
  item: GroceryItem,
  postalCode: string
): Promise<GroceryItem> {
  try {
    const payload: any = {
      query: item.name,
      sort: "price_asc",
      include_unavailable: false,
      include_fallback_results: false,
    };

    if (/^\d{5}$/.test(postalCode)) {
      payload.postal_code = postalCode;
    }

    const response = await fetch(
      "https://api.reefapi.com/carrefour-fr/v1/search",
      {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      console.error(
        "ReefAPI",
        response.status,
        await response.text()
      );

      return item;
    }

    const json = await response.json();

    const results = Array.isArray(json?.data?.results)
      ? json.data.results
      : [];

    const ranked = results
      .map((product: any) => ({
        product,
        score: productScore(
          item.name,
          String(product?.title || product?.name || "")
        ),
      }))
      .filter(
        (x: any) =>
          x.score >= 0.65 &&
          priceOf(x.product) !== null
      )
      .sort(
        (a: any, b: any) =>
          b.score - a.score ||
          (priceOf(a.product)! - priceOf(b.product)!)
      );

    const product = ranked[0]?.product;

    if (!product) {
      return item;
    }

    const price = priceOf(product);

    if (price === null) {
      return item;
    }

    return {
      ...item,

      price,

      priceSource: /^\d{5}$/.test(postalCode)
        ? `Carrefour · ${postalCode}`
        : "Carrefour · catalogue en ligne",

      imageUrl: imageOf(product),

      barcode:
        String(
          product?.ean ||
            product?.barcode ||
            product?.product_id ||
            ""
        ) || undefined,

      brand: product?.brand
        ? String(product.brand)
        : undefined,

      productTitle:
        product?.title || product?.name
          ? String(product?.title || product?.name)
          : undefined,

      packaging: product?.packaging
        ? String(product.packaging)
        : undefined,

      priceDate: new Date()
        .toISOString()
        .slice(0, 10),
    };
  } catch (error) {
    console.error(
      "Carrefour enrichment",
      item.name,
      error
    );

    return item;
  }
}

/* =========================================================
   OPEN PRICES — TOUTES LES AUTRES ENSEIGNES
========================================================= */

async function getOpenPricesLocations(
  store: string,
  postalCode: string,
  city: string
) {
  try {
    /*
      On récupère les lieux Open Prices.
      Ensuite NOX filtre STRICTEMENT l'enseigne.
    */

    const params = new URLSearchParams();

    params.set("page", "1");
    params.set("size", "100");

    const response = await fetch(
      `https://prices.openfoodfacts.org/api/v1/locations?${params.toString()}`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error(
        "Open Prices locations",
        response.status,
        await response.text()
      );

      return [];
    }

    const json = await response.json();

    const locations = Array.isArray(json?.items)
      ? json.items
      : Array.isArray(json?.results)
      ? json.results
      : [];

    const wantedPostal = postalCode.trim();
    const wantedCity = norm(city);

    return locations
      .filter((location: any) =>
        sameStore(store, location)
      )
      .map((location: any) => {
        let geoScore = 0;

        const locationPostal = String(
          location?.osm_address_postcode || ""
        ).trim();

        const locationCity = norm(
          String(location?.osm_address_city || "")
        );

        if (
          wantedPostal &&
          locationPostal === wantedPostal
        ) {
          geoScore += 10;
        }

        if (
          wantedCity &&
          locationCity &&
          (
            locationCity.includes(wantedCity) ||
            wantedCity.includes(locationCity)
          )
        ) {
          geoScore += 5;
        }

        return {
          ...location,
          _geoScore: geoScore,
        };
      })
      .sort(
        (a: any, b: any) =>
          b._geoScore - a._geoScore ||
          Number(b?.price_count || 0) -
            Number(a?.price_count || 0)
      )
      .slice(0, 8);
  } catch (error) {
    console.error(
      "Open Prices locations error",
      error
    );

    return [];
  }
}

async function getPricesForLocation(
  locationId: number
) {
  try {
    const params = new URLSearchParams();

    params.set("location_id", String(locationId));
    params.set("page", "1");
    params.set("size", "100");
    params.set("ordering", "-date");

    const response = await fetch(
      `https://prices.openfoodfacts.org/api/v1/prices?${params.toString()}`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error(
        "Open Prices prices",
        response.status,
        await response.text()
      );

      return [];
    }

    const json = await response.json();

    if (Array.isArray(json?.items)) {
      return json.items;
    }

    if (Array.isArray(json?.results)) {
      return json.results;
    }

    return [];
  } catch (error) {
    console.error(
      "Open Prices price error",
      locationId,
      error
    );

    return [];
  }
}

function openPriceTitle(price: any) {
  return String(
    price?.product?.product_name ||
      price?.product_name ||
      price?.product?.name ||
      ""
  );
}

function validEuroPrice(price: any) {
  const value = Number(price?.price);

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return false;
  }

  const currency = String(
    price?.currency || "EUR"
  ).toUpperCase();

  return currency === "EUR";
}

async function enrichOpenPrices(
  item: GroceryItem,
  store: string,
  locations: any[]
): Promise<GroceryItem> {
  try {
    const candidates: any[] = [];

    /*
      Important :
      on ne consulte QUE les location_id qui ont déjà
      été validés comme appartenant à l'enseigne choisie.
    */

    for (const location of locations.slice(0, 5)) {
      const locationId = Number(location?.id);

      if (!Number.isFinite(locationId)) {
        continue;
      }

      const prices =
        await getPricesForLocation(locationId);

      for (const price of prices) {
        if (!validEuroPrice(price)) {
          continue;
        }

        const title = openPriceTitle(price);

        if (!title) {
          continue;
        }

        const score = productScore(
          item.name,
          title
        );

        if (score < 0.72) {
          continue;
        }

        candidates.push({
          price,
          location,
          score,
        });
      }
    }

    if (!candidates.length) {
      return item;
    }

    candidates.sort((a, b) => {
      // 1. correspondance aliment
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      // 2. proximité code postal / ville
      if (
        b.location._geoScore !==
        a.location._geoScore
      ) {
        return (
          b.location._geoScore -
          a.location._geoScore
        );
      }

      // 3. donnée la plus récente
      const dateA = new Date(
        a.price?.date || 0
      ).getTime();

      const dateB = new Date(
        b.price?.date || 0
      ).getTime();

      return dateB - dateA;
    });

    const best = candidates[0];

    const p = best.price;
    const location = best.location;

    const numericPrice = Number(p.price);

    if (
      !Number.isFinite(numericPrice) ||
      numericPrice <= 0
    ) {
      return item;
    }

    /*
      Double sécurité :
      même après sélection, on revérifie l'enseigne.
    */
    if (!sameStore(store, location)) {
      return item;
    }

    const locationName =
      location?.osm_name ||
      location?.osm_brand ||
      store;

    return {
      ...item,

      price: numericPrice,

      priceSource:
        `Open Prices · ${locationName}`,

      imageUrl:
        imageOf(p) || undefined,

      barcode:
        String(
          p?.product_code ||
            p?.product?.code ||
            ""
        ) || undefined,

      brand:
        p?.product?.brands
          ? String(p.product.brands)
          : undefined,

      productTitle:
        openPriceTitle(p) || undefined,

      packaging:
        p?.product?.quantity
          ? String(p.product.quantity)
          : undefined,

      priceDate:
        p?.date
          ? String(p.date)
          : undefined,
    };
  } catch (error) {
    console.error(
      "Open Prices enrichment",
      item.name,
      error
    );

    return item;
  }
}

/* =========================================================
   PARSING CLAUDE
========================================================= */

function parseList(text: string): GroceryItem[] {
  const cleaned = String(text || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");

  if (start < 0 || end <= start) {
    throw new Error(
      "Tableau JSON Anthropic introuvable"
    );
  }

  const parsed = JSON.parse(
    cleaned.slice(start, end + 1)
  );

  if (!Array.isArray(parsed)) {
    throw new Error(
      "Réponse Anthropic invalide"
    );
  }

  return parsed
    .slice(0, 30)
    .map((x: any) => ({
      name: String(x?.name || "").trim(),

      qty: String(x?.qty || "").trim(),

      category:
        String(x?.category || "Autres"),

      note:
        x?.note
          ? String(x.note)
          : "",

      price: null,
    }))
    .filter(
      (x: GroceryItem) =>
        x.name && x.qty
    );
}

/* =========================================================
   EDGE FUNCTION
========================================================= */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const anthropicKey = Deno.env.get(
      "ANTHROPIC_API_KEY nox ai"
    );

    const reefKey = Deno.env.get(
      "REEF_API_KEY"
    );

    const workspaceId =
      "wrkspc_01L3cb9d5iNZv6pGhXFb1jW2";

    if (!anthropicKey) {
      throw new Error(
        "Secret Anthropic introuvable"
      );
    }

    const body = await req.json();

    const prompt = body?.prompt;

    const store = String(
      body?.store || ""
    ).trim();

    const city = String(
      body?.city || ""
    ).trim();

    const postalCode = String(
      body?.postalCode || ""
    ).trim();

    if (
      !prompt ||
      typeof prompt !== "string"
    ) {
      return new Response(
        JSON.stringify({
          error: "Prompt manquant",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type":
              "application/json",
          },
        }
      );
    }

    /* =====================================================
       1. CLAUDE CONSTRUIT LA LISTE
    ===================================================== */

    const anthropicResponse = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "x-api-key":
            anthropicKey,

          "anthropic-version":
            "2023-06-01",

          "anthropic-workspace-id":
            workspaceId,
        },

        body: JSON.stringify({
          model:
            "claude-sonnet-4-5",

          max_tokens: 4096,

          temperature: 0.25,

          system: `
Tu es le moteur nutritionnel NOXAI.

Tu dois construire une liste de courses réellement cohérente avec :

- objectif nutritionnel
- calories et macros
- régime alimentaire
- allergies
- goûts et refus
- budget maximum
- durée
- nombre de personnes
- contenu du frigo
- enseigne choisie

RÈGLES IMPORTANTES :

1. FRIGO VIDE :
propose uniquement les aliments nécessaires.

2. COMPLÉTER :
propose uniquement ce qui manque.

3. Le budget est une contrainte prioritaire.
Privilégie les aliments simples, économiques et facilement trouvables.

4. Utilise des noms d'aliments simples et recherchables :
"Riz"
"Poulet"
"Œufs"
"Pommes"
"Carottes"
"Lentilles"
etc.

Évite les descriptions longues et inventées.

5. N'invente JAMAIS :
- prix
- promotion
- stock
- disponibilité
- marque
- référence magasin
- code-barres

6. price doit TOUJOURS rester null.
Le backend cherchera les prix après ta réponse.

Retourne UNIQUEMENT un tableau JSON.

Format exact :

[
  {
    "name":"...",
    "qty":"...",
    "category":"Fruits & légumes|Protéines|Féculents|Produits frais|Épicerie|Petit-déjeuner|Autres",
    "note":"",
    "price":null
  }
]

Aucun markdown.
Aucun commentaire autour du JSON.
          `.trim(),

          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      }
    );

    const anthropicData =
      await anthropicResponse.json();

    if (!anthropicResponse.ok) {
      return new Response(
        JSON.stringify({
          error:
            "Erreur Anthropic",

          details:
            anthropicData,
        }),
        {
          status:
            anthropicResponse.status,

          headers: {
            ...corsHeaders,
            "Content-Type":
              "application/json",
          },
        }
      );
    }

    const textBlock =
      anthropicData?.content?.find(
        (x: any) =>
          x?.type === "text"
      );

    if (!textBlock?.text) {
      throw new Error(
        "Réponse Anthropic sans texte"
      );
    }

    let items =
      parseList(textBlock.text);

    /* =====================================================
       2. ENRICHISSEMENT PRIX
    ===================================================== */

    let provider:
      | "ReefAPI"
      | "Open Prices"
      | null = null;

    /*
      CARREFOUR :
      ReefAPI uniquement.
      Open Prices n'est JAMAIS appelé.
    */
    if (
      isCarrefour(store) &&
      reefKey
    ) {
      provider = "ReefAPI";

      const enriched: GroceryItem[] = [];

      for (const item of items) {
        enriched.push(
          await enrichCarrefour(
            reefKey,
            item,
            postalCode
          )
        );
      }

      items = enriched;
    }

    /*
      TOUTES LES AUTRES ENSEIGNES :
      Open Prices uniquement.
      ReefAPI n'est JAMAIS appelé.
    */
    else if (
      store &&
      norm(store) !== "autre"
    ) {
      provider = "Open Prices";

      const locations =
        await getOpenPricesLocations(
          store,
          postalCode,
          city
        );

      console.log(
        `Open Prices: ${locations.length} magasins ${store} trouvés`
      );

      if (locations.length) {
        const enriched: GroceryItem[] = [];

        for (const item of items) {
          enriched.push(
            await enrichOpenPrices(
              item,
              store,
              locations
            )
          );
        }

        items = enriched;
      }
    }

    /* =====================================================
       3. RÉPONSE AU FRONTEND
    ===================================================== */

    const verifiedCount =
      items.filter(
        (x) =>
          typeof x.price === "number" &&
          !!x.priceSource
      ).length;

    const imageCount =
      items.filter(
        (x) => !!x.imageUrl
      ).length;

    return new Response(
      JSON.stringify({
        content: [
          {
            type: "text",
            text: JSON.stringify(items),
          },
        ],

        usage:
          anthropicData?.usage ??
          null,

        pricing: {
          retailer:
            store || null,

          postalCode:
            postalCode || null,

          city:
            city || null,

          provider,

          verifiedCount,

          imageCount,

          totalItems:
            items.length,
        },
      }),
      {
        status: 200,

        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      }
    );
  } catch (error) {
    console.error(
      "generate-groceries",
      error
    );

    return new Response(
      JSON.stringify({
        error:
          "Erreur interne generate-groceries",

        message:
          error instanceof Error
            ? error.message
            : String(error),
      }),
      {
        status: 500,

        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      }
    );
  }
});
