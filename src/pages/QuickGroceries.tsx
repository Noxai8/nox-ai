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

/* =========================================================
   PRODUIT : MATCHING STRICT
========================================================= */

function productScore(wanted: string, title: string) {
  const wantedWords = usefulWords(wanted);
  const titleWords = new Set(usefulWords(title));

  if (!wantedWords.length || !titleWords.size) return 0;

  let matches = 0;

  for (const word of wantedWords) {
    if (titleWords.has(word)) {
      matches++;
      continue;
    }

    if (
      word.endsWith("s") &&
      titleWords.has(word.slice(0, -1))
    ) {
      matches++;
      continue;
    }

    if (titleWords.has(`${word}s`)) {
      matches++;
    }
  }

  let score = matches / wantedWords.length;

  const wantedNorm = norm(wanted);
  const titleNorm = norm(title);

  if (titleNorm === wantedNorm) {
    score += 0.25;
  } else if (
    titleNorm.includes(wantedNorm)
  ) {
    score += 0.15;
  }

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
    const n =
      typeof value === "number"
        ? value
        : Number(value);

    if (
      Number.isFinite(n) &&
      n > 0
    ) {
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

    p?.product?.image_front_url,
    p?.product?.image_front_small_url,

    p?.images?.[0]?.url,
    p?.images?.[0],
  ];

  return candidates.find(
    (x) =>
      typeof x === "string" &&
      /^https?:\/\//.test(x)
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

/*
  Nom canonique interne.
  IMPORTANT :
  chaque enseigne est volontairement séparée.
*/

function canonicalStore(store: string) {
  const s = norm(store);

  if (s.includes("leclerc")) {
    return "leclerc";
  }

  if (s.includes("intermarche")) {
    return "intermarche";
  }

  if (s.includes("auchan")) {
    return "auchan";
  }

  if (s.includes("lidl")) {
    return "lidl";
  }

  if (s.includes("aldi")) {
    return "aldi";
  }

  if (
    s.includes("super u") ||
    s.includes("hyper u") ||
    s.includes("u express") ||
    s.includes("magasins u")
  ) {
    return "systeme u";
  }

  if (s.includes("monoprix")) {
    return "monoprix";
  }

  if (s.includes("franprix")) {
    return "franprix";
  }

  if (s.includes("netto")) {
    return "netto";
  }

  if (s.includes("grand frais")) {
    return "grand frais";
  }

  if (
    s === "match" ||
    s.includes("supermarche match")
  ) {
    return "match";
  }

  if (s.includes("casino")) {
    return "casino";
  }

  return s;
}

function locationText(location: any) {
  return norm(
    [
      location?.osm_name,
      location?.osm_brand,
      location?.osm_display_name,

      location?.name,
      location?.brand,

      location?.osm_address_name,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

/*
  CORRECTION PRINCIPALE.

  On ne fait PLUS :
     haystack.includes(alias)

  de manière trop permissive.

  On identifie d'abord l'enseigne du lieu,
  puis on compare l'identité canonique.
*/

function detectLocationStore(
  location: any
): string | null {
  const text = locationText(location);

  if (!text) return null;

  /*
    L'ordre est important.
    On détecte les enseignes explicitement.
  */

  if (
    /\be\s*leclerc\b/.test(text) ||
    /\bleclerc\b/.test(text)
  ) {
    return "leclerc";
  }

  if (/\bintermarche\b/.test(text)) {
    return "intermarche";
  }

  if (/\bauchan\b/.test(text)) {
    return "auchan";
  }

  if (/\blidl\b/.test(text)) {
    return "lidl";
  }

  if (/\baldi\b/.test(text)) {
    return "aldi";
  }

  if (
    /\bsuper u\b/.test(text) ||
    /\bhyper u\b/.test(text) ||
    /\bu express\b/.test(text) ||
    /\bmagasins u\b/.test(text)
  ) {
    return "systeme u";
  }

  if (/\bmonoprix\b/.test(text)) {
    return "monoprix";
  }

  if (/\bfranprix\b/.test(text)) {
    return "franprix";
  }

  if (/\bnetto\b/.test(text)) {
    return "netto";
  }

  if (/\bgrand frais\b/.test(text)) {
    return "grand frais";
  }

  if (
    /\bsupermarche match\b/.test(text) ||
    /\bmatch\b/.test(text)
  ) {
    return "match";
  }

  if (/\bcasino\b/.test(text)) {
    return "casino";
  }

  return null;
}

function sameStore(
  selectedStore: string,
  location: any
) {
  const wanted =
    canonicalStore(selectedStore);

  const detected =
    detectLocationStore(location);

  /*
    Si Open Prices ne permet pas d'identifier
    clairement l'enseigne : REFUS.

    On préfère aucun prix plutôt qu'un prix
    provenant potentiellement d'une autre enseigne.
  */

  if (!wanted || !detected) {
    return false;
  }

  return wanted === detected;
}

/* =========================================================
   DATE OPEN PRICES
========================================================= */

function dateAgeDays(dateValue: string) {
  if (!dateValue) return Infinity;

  const time =
    new Date(`${dateValue}T12:00:00Z`)
      .getTime();

  if (!Number.isFinite(time)) {
    return Infinity;
  }

  return (
    Date.now() - time
  ) / 86400000;
}

/*
  Évite d'afficher comme "prix vérifié actuel"
  une observation extrêmement ancienne.

  120 jours laisse davantage de chances
  d'obtenir des résultats tout en supprimant
  les données vraiment obsolètes.
*/

const MAX_OPEN_PRICE_AGE_DAYS = 120;

/* =========================================================
   CARREFOUR
   REEFAPI UNIQUEMENT
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
      payload.postal_code =
        postalCode;
    }

    const response = await fetch(
      "https://api.reefapi.com/carrefour-fr/v1/search",
      {
        method: "POST",

        headers: {
          "x-api-key": apiKey,
          "content-type":
            "application/json",
        },

        body:
          JSON.stringify(payload),
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

    const json =
      await response.json();

    const results =
      Array.isArray(
        json?.data?.results
      )
        ? json.data.results
        : [];

    const ranked =
      results
        .map((product: any) => ({
          product,

          score:
            productScore(
              item.name,
              String(
                product?.title ||
                product?.name ||
                ""
              )
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
            (
              priceOf(a.product)! -
              priceOf(b.product)!
            )
        );

    const product =
      ranked[0]?.product;

    if (!product) {
      return item;
    }

    const price =
      priceOf(product);

    if (price === null) {
      return item;
    }

    return {
      ...item,

      price,

      priceSource:
        /^\d{5}$/.test(postalCode)
          ? `Carrefour · ${postalCode}`
          : "Carrefour · catalogue en ligne",

      imageUrl:
        imageOf(product),

      barcode:
        String(
          product?.ean ||
          product?.barcode ||
          product?.product_id ||
          ""
        ) || undefined,

      brand:
        product?.brand
          ? String(product.brand)
          : undefined,

      productTitle:
        product?.title ||
        product?.name
          ? String(
              product?.title ||
              product?.name
            )
          : undefined,

      packaging:
        product?.packaging
          ? String(
              product.packaging
            )
          : undefined,

      priceDate:
        new Date()
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
   OPEN PRICES — LOCATIONS
========================================================= */

async function getOpenPricesLocations(
  store: string,
  postalCode: string,
  city: string
) {
  try {
    const params =
      new URLSearchParams();

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

    const json =
      await response.json();

    const locations =
      Array.isArray(json?.items)
        ? json.items
        : Array.isArray(
            json?.results
          )
        ? json.results
        : [];

    const wantedPostal =
      postalCode.trim();

    const wantedCity =
      norm(city);

    /*
      ICI on élimine immédiatement
      tous les magasins d'une autre enseigne.
    */

    const exactStoreLocations =
      locations.filter(
        (location: any) =>
          sameStore(
            store,
            location
          )
      );

    return exactStoreLocations

      .map((location: any) => {
        let geoScore = 0;

        const locationPostal =
          String(
            location
              ?.osm_address_postcode ||
              ""
          ).trim();

        const locationCity =
          norm(
            String(
              location
                ?.osm_address_city ||
                ""
            )
          );

        if (
          wantedPostal &&
          locationPostal ===
            wantedPostal
        ) {
          geoScore += 100;
        }

        /*
          Même département = petit bonus
          uniquement si on dispose
          d'un code postal.
        */

        if (
          wantedPostal.length === 5 &&
          locationPostal.length === 5 &&
          wantedPostal.slice(0, 2) ===
            locationPostal.slice(0, 2)
        ) {
          geoScore += 15;
        }

        if (
          wantedCity &&
          locationCity &&
          (
            locationCity ===
              wantedCity ||
            locationCity.includes(
              wantedCity
            ) ||
            wantedCity.includes(
              locationCity
            )
          )
        ) {
          geoScore += 50;
        }

        return {
          ...location,

          _geoScore:
            geoScore,

          _detectedStore:
            detectLocationStore(
              location
            ),
        };
      })

      .sort(
        (a: any, b: any) =>
          b._geoScore -
            a._geoScore ||
          Number(
            b?.price_count || 0
          ) -
            Number(
              a?.price_count || 0
            )
      )

      .slice(0, 10);
  } catch (error) {
    console.error(
      "Open Prices locations error",
      error
    );

    return [];
  }
}

/* =========================================================
   OPEN PRICES — PRICES
========================================================= */

async function getPricesForLocation(
  locationId: number
) {
  try {
    const params =
      new URLSearchParams();

    params.set(
      "location_id",
      String(locationId)
    );

    params.set("page", "1");
    params.set("size", "100");
    params.set(
      "ordering",
      "-date"
    );

    const response =
      await fetch(
        `https://prices.openfoodfacts.org/api/v1/prices?${params.toString()}`,
        {
          headers: {
            Accept:
              "application/json",
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

    const json =
      await response.json();

    if (
      Array.isArray(json?.items)
    ) {
      return json.items;
    }

    if (
      Array.isArray(json?.results)
    ) {
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

function openPriceTitle(
  price: any
) {
  return String(
    price?.product
      ?.product_name ||
    price?.product_name ||
    price?.product?.name ||
    ""
  ).trim();
}

function validEuroPrice(
  price: any
) {
  const value =
    Number(price?.price);

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return false;
  }

  const currency =
    String(
      price?.currency ||
      "EUR"
    ).toUpperCase();

  return currency === "EUR";
}

/* =========================================================
   OPEN PRICES — MATCH FINAL
========================================================= */

async function enrichOpenPrices(
  item: GroceryItem,
  store: string,
  locations: any[]
): Promise<GroceryItem> {
  try {
    const candidates: any[] = [];

    /*
      Seulement les magasins déjà
      certifiés comme étant la bonne enseigne.
    */

    for (
      const location
      of locations.slice(0, 6)
    ) {
      /*
        Triple sécurité.
      */

      if (
        !sameStore(
          store,
          location
        )
      ) {
        continue;
      }

      const locationId =
        Number(location?.id);

      if (
        !Number.isFinite(
          locationId
        )
      ) {
        continue;
      }

      const prices =
        await getPricesForLocation(
          locationId
        );

      for (
        const price
        of prices
      ) {
        if (
          !validEuroPrice(price)
        ) {
          continue;
        }

        /*
          Élimine les observations
          trop anciennes.
        */

        const priceDate =
          String(
            price?.date || ""
          );

        if (
          dateAgeDays(priceDate) >
          MAX_OPEN_PRICE_AGE_DAYS
        ) {
          continue;
        }

        const title =
          openPriceTitle(price);

        if (!title) {
          continue;
        }

        const score =
          productScore(
            item.name,
            title
          );

        /*
          Match volontairement strict.
        */

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
      /*
        Aucun vrai résultat suffisamment
        fiable = price reste null.

        Le frontend utilisera alors
        Estimation NOXAI.
      */

      return item;
    }

    candidates.sort(
      (a, b) => {
        /*
          1 — meilleur aliment
        */

        if (
          b.score !== a.score
        ) {
          return (
            b.score - a.score
          );
        }

        /*
          2 — meilleur emplacement
        */

        if (
          b.location._geoScore !==
          a.location._geoScore
        ) {
          return (
            b.location._geoScore -
            a.location._geoScore
          );
        }

        /*
          3 — plus récent
        */

        const dateA =
          new Date(
            a.price?.date || 0
          ).getTime();

        const dateB =
          new Date(
            b.price?.date || 0
          ).getTime();

        return dateB - dateA;
      }
    );

    const best =
      candidates[0];

    const p =
      best.price;

    const location =
      best.location;

    /*
      DERNIÈRE vérification avant
      d'envoyer le prix au frontend.
    */

    if (
      !sameStore(
        store,
        location
      )
    ) {
      console.error(
        "SECURITY STORE MISMATCH",
        {
          selected: store,
          detected:
            detectLocationStore(
              location
            ),
          location:
            locationText(
              location
            ),
        }
      );

      return item;
    }

    const numericPrice =
      Number(p?.price);

    if (
      !Number.isFinite(
        numericPrice
      ) ||
      numericPrice <= 0
    ) {
      return item;
    }

    const date =
      String(
        p?.date || ""
      );

    if (
      dateAgeDays(date) >
      MAX_OPEN_PRICE_AGE_DAYS
    ) {
      return item;
    }

    /*
      Le label utilise l'enseigne
      CHOISIE par l'utilisateur,
      après validation du magasin.

      On évite ainsi d'afficher un nom
      ambigu venant du lieu.
    */

    return {
      ...item,

      price:
        numericPrice,

      priceSource:
        `Open Prices · ${store}`,

      imageUrl:
        imageOf(p),

      barcode:
        String(
          p?.product_code ||
          p?.product?.code ||
          ""
        ) || undefined,

      brand:
        p?.product?.brands
          ? String(
              p.product.brands
            )
          : undefined,

      productTitle:
        openPriceTitle(p) ||
        undefined,

      packaging:
        p?.product?.quantity
          ? String(
              p.product.quantity
            )
          : undefined,

      priceDate:
        date || undefined,
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
   PARSE CLAUDE
========================================================= */

function parseList(
  text: string
): GroceryItem[] {
  const cleaned =
    String(text || "")
      .replace(
        /```json/gi,
        ""
      )
      .replace(
        /```/g,
        ""
      )
      .trim();

  const start =
    cleaned.indexOf("[");

  const end =
    cleaned.lastIndexOf("]");

  if (
    start < 0 ||
    end <= start
  ) {
    throw new Error(
      "Tableau JSON Anthropic introuvable"
    );
  }

  const parsed =
    JSON.parse(
      cleaned.slice(
        start,
        end + 1
      )
    );

  if (
    !Array.isArray(parsed)
  ) {
    throw new Error(
      "Réponse Anthropic invalide"
    );
  }

  return parsed
    .slice(0, 30)

    .map((x: any) => ({
      name:
        String(
          x?.name || ""
        ).trim(),

      qty:
        String(
          x?.qty || ""
        ).trim(),

      category:
        String(
          x?.category ||
          "Autres"
        ),

      note:
        x?.note
          ? String(x.note)
          : "",

      price: null,
    }))

    .filter(
      (x: GroceryItem) =>
        x.name &&
        x.qty
    );
}

/* =========================================================
   EDGE FUNCTION
========================================================= */

serve(async (req) => {
  if (
    req.method === "OPTIONS"
  ) {
    return new Response(
      "ok",
      {
        headers:
          corsHeaders,
      }
    );
  }

  try {
    const anthropicKey =
      Deno.env.get(
        "ANTHROPIC_API_KEY nox ai"
      );

    const reefKey =
      Deno.env.get(
        "REEF_API_KEY"
      );

    const workspaceId =
      "wrkspc_01L3cb9d5iNZv6pGhXFb1jW2";

    if (!anthropicKey) {
      throw new Error(
        "Secret Anthropic introuvable"
      );
    }

    const body =
      await req.json();

    const prompt =
      body?.prompt;

    const store =
      String(
        body?.store || ""
      ).trim();

    const city =
      String(
        body?.city || ""
      ).trim();

    const postalCode =
      String(
        body?.postalCode || ""
      ).trim();

    if (
      !prompt ||
      typeof prompt !==
        "string"
    ) {
      return new Response(
        JSON.stringify({
          error:
            "Prompt manquant",
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
       1 — GÉNÉRATION NUTRITIONNELLE
    ===================================================== */

    const anthropicResponse =
      await fetch(
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

          body:
            JSON.stringify({
              model:
                "claude-sonnet-4-5",

              max_tokens:
                4096,

              temperature:
                0.25,

              system: `
Tu es le moteur nutritionnel NOXAI.

Construis une liste de courses cohérente avec toutes les contraintes données par l'utilisateur.

Respecte impérativement :
- objectif nutritionnel
- calories et macros
- régime alimentaire
- allergies
- goûts/refus
- budget
- durée
- nombre de personnes
- contenu du frigo
- enseigne

FRIGO VIDE :
propose les courses nécessaires.

COMPLÉTER :
propose uniquement ce qui manque.

BUDGET :
privilégie les aliments simples et économiques.
Adapte les quantités et remplace les aliments coûteux si nécessaire.

NOMS :
utilise des noms simples et recherchables :
Riz
Poulet
Œufs
Pommes
Carottes
Lentilles
etc.

N'INVENTE JAMAIS :
- prix
- promotion
- stock
- disponibilité
- marque
- référence magasin
- code-barres

price doit TOUJOURS être null.
Le backend recherche les prix ensuite.

Retourne UNIQUEMENT un tableau JSON.

Format :

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
Aucun texte avant ou après.
              `.trim(),

              messages: [
                {
                  role:
                    "user",

                  content:
                    prompt,
                },
              ],
            }),
        }
      );

    const anthropicData =
      await anthropicResponse
        .json();

    if (
      !anthropicResponse.ok
    ) {
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
      anthropicData
        ?.content
        ?.find(
          (x: any) =>
            x?.type ===
            "text"
        );

    if (!textBlock?.text) {
      throw new Error(
        "Réponse Anthropic sans texte"
      );
    }

    let items =
      parseList(
        textBlock.text
      );

    /* =====================================================
       2 — PRIX
    ===================================================== */

    let provider:
      | "ReefAPI"
      | "Open Prices"
      | null = null;

    /*
      CARREFOUR / CARREFOUR MARKET
      => ReefAPI seulement
    */

    if (
      isCarrefour(store) &&
      reefKey
    ) {
      provider =
        "ReefAPI";

      const enriched:
        GroceryItem[] = [];

      for (
        const item
        of items
      ) {
        enriched.push(
          await enrichCarrefour(
            reefKey,
            item,
            postalCode
          )
        );
      }

      items =
        enriched;
    }

    /*
      AUTRES ENSEIGNES
      => Open Prices seulement
    */

    else if (
      store &&
      norm(store) !==
        "autre"
    ) {
      provider =
        "Open Prices";

      const locations =
        await getOpenPricesLocations(
          store,
          postalCode,
          city
        );

      console.log(
        "OPEN PRICES STORE",
        {
          selectedStore:
            store,

          canonical:
            canonicalStore(
              store
            ),

          matchingLocations:
            locations.map(
              (l: any) => ({
                id: l?.id,
                store:
                  l?._detectedStore,
                name:
                  l?.osm_name,
                brand:
                  l?.osm_brand,
                postcode:
                  l?.osm_address_postcode,
                city:
                  l?.osm_address_city,
                score:
                  l?._geoScore,
              })
            ),
        }
      );

      if (
        locations.length
      ) {
        const enriched:
          GroceryItem[] = [];

        for (
          const item
          of items
        ) {
          enriched.push(
            await enrichOpenPrices(
              item,
              store,
              locations
            )
          );
        }

        items =
          enriched;
      }
    }

    /* =====================================================
       3 — CONTRÔLE FINAL ANTI-MÉLANGE
    ===================================================== */

    /*
      Par sécurité, un résultat Open Prices
      n'est conservé que s'il vient du chemin
      non-Carrefour.

      Carrefour reste totalement indépendant.
    */

    if (isCarrefour(store)) {
      items =
        items.map((item) => {
          if (
            item.priceSource
              ?.startsWith(
                "Open Prices"
              )
          ) {
            return {
              ...item,
              price: null,
              priceSource:
                undefined,
              imageUrl:
                undefined,
              barcode:
                undefined,
              brand:
                undefined,
              priceDate:
                undefined,
            };
          }

          return item;
        });
    }

    const verifiedCount =
      items.filter(
        (x) =>
          typeof x.price ===
            "number" &&
          !!x.priceSource
      ).length;

    const imageCount =
      items.filter(
        (x) =>
          !!x.imageUrl
      ).length;

    return new Response(
      JSON.stringify({
        content: [
          {
            type: "text",

            text:
              JSON.stringify(
                items
              ),
          },
        ],

        usage:
          anthropicData
            ?.usage ??
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

          openPricesMaxAgeDays:
            provider ===
            "Open Prices"
              ? MAX_OPEN_PRICE_AGE_DAYS
              : null,
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
