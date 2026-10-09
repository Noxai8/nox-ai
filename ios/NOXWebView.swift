import SwiftUI
import WebKit
import HealthKit

/// Loads only the configured NOX HTTPS origin. HealthKit is never exposed to third-party pages.
struct NOXWebView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        let controller = WKUserContentController()
        controller.add(context.coordinator, name: "noxHealth")
        configuration.userContentController = controller
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.isInspectable = false
        context.coordinator.webView = webView
        guard let address = Bundle.main.object(forInfoDictionaryKey: "NOXWebURL") as? String,
              let url = URL(string: address),
              url.scheme == "https",
              let host = url.host,
              !host.isEmpty else {
            assertionFailure("Configure NOX_WEB_URL with an HTTPS NOX deployment")
            return webView
        }
        context.coordinator.allowedHost = host
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    @MainActor
    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        weak var webView: WKWebView?
        var allowedHost: String?
        private let health = NOXHealthKitSteps()
        private var requesting = false

        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
            if url.scheme == "https", url.host == allowedHost {
                decisionHandler(.allow)
            } else {
                // External links open in Safari; never grant them access to the native bridge.
                if navigationAction.navigationType == .linkActivated, url.scheme == "https" {
                    UIApplication.shared.open(url)
                }
                decisionHandler(.cancel)
            }
        }

        func userContentController(_ userContentController: WKUserContentController,
                                   didReceive message: WKScriptMessage) {
            guard message.name == "noxHealth",
                  message.frameInfo.isMainFrame,
                  message.frameInfo.securityOrigin.protocol == "https",
                  message.frameInfo.securityOrigin.host == allowedHost,
                  let body = message.body as? [String: Any],
                  body["action"] as? String == "requestSteps",
                  !requesting else { return }
            requesting = true
            Task { @MainActor in
                defer { requesting = false }
                do {
                    try await health.requestStepReadAccess()
                    let count = try await health.todaySteps()
                    let formatter = DateFormatter()
                    formatter.calendar = Calendar(identifier: .gregorian)
                    formatter.locale = Locale(identifier: "en_US_POSIX")
                    formatter.timeZone = .current
                    formatter.dateFormat = "yyyy-MM-dd"
                    let payload: [String: Any] = [
                        "date": formatter.string(from: Date()),
                        "count": count,
                        "source": "healthkit"
                    ]
                    guard let data = try? JSONSerialization.data(withJSONObject: payload),
                          let json = String(data: data, encoding: .utf8) else { return }
                    // Pass serialized JSON as an expression, not interpolated user-controlled JS.
                    webView?.evaluateJavaScript("window.receiveNOXHealthSteps?.(\(json))")
                } catch {
                    // No data/denied is not zero. Never send an invented step count.
                    NSLog("NOX HealthKit sync unavailable: %@", String(describing: error))
                }
            }
        }
    }
}
