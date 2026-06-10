import SwiftUI

@main
struct PatioCarrosApp: App {
    @StateObject private var db = DatabaseService.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(db)
                .preferredColorScheme(.dark)
        }
    }
}
