import SwiftUI

struct ContentView: View {
    @EnvironmentObject var db: DatabaseService

    var body: some View {
        TabView {
            DashboardView()
                .tabItem {
                    Label("Dashboard", systemImage: "chart.bar.fill")
                }

            EntradaView()
                .tabItem {
                    Label("Entrada", systemImage: "arrow.down.circle.fill")
                }

            SaidaView()
                .tabItem {
                    Label("Saída", systemImage: "arrow.up.circle.fill")
                }

            PatioView()
                .tabItem {
                    Label("Pátio", systemImage: "car.fill")
                }

            HistoricoView()
                .tabItem {
                    Label("Histórico", systemImage: "clock.fill")
                }

            SettingsView()
                .tabItem {
                    Label("Config", systemImage: "gear")
                }
        }
        .task {
            await db.connect()
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(DatabaseService.shared)
        .preferredColorScheme(.dark)
}
