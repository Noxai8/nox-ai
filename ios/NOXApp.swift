import SwiftUI

@main
struct NOXApp: App {
    var body: some Scene {
        WindowGroup {
            NOXWebView()
                .ignoresSafeArea(edges: .bottom)
        }
    }
}
