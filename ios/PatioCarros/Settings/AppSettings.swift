import Foundation
import Combine

class AppSettings: ObservableObject {
    static let shared = AppSettings()

    @Published var dbHost: String {
        didSet { UserDefaults.standard.set(dbHost, forKey: "db_host") }
    }
    @Published var dbPort: Int {
        didSet { UserDefaults.standard.set(dbPort, forKey: "db_port") }
    }
    @Published var dbUser: String {
        didSet { UserDefaults.standard.set(dbUser, forKey: "db_user") }
    }
    @Published var dbPassword: String {
        didSet { UserDefaults.standard.set(dbPassword, forKey: "db_password") }
    }
    @Published var dbName: String {
        didSet { UserDefaults.standard.set(dbName, forKey: "db_name") }
    }
    @Published var detranApiUrl: String {
        didSet { UserDefaults.standard.set(detranApiUrl, forKey: "detran_api_url") }
    }
    @Published var detranApiKey: String {
        didSet { UserDefaults.standard.set(detranApiKey, forKey: "detran_api_key") }
    }

    private init() {
        dbHost = UserDefaults.standard.string(forKey: "db_host") ?? "192.168.1.100"
        dbPort = UserDefaults.standard.integer(forKey: "db_port").nonZero ?? 3306
        dbUser = UserDefaults.standard.string(forKey: "db_user") ?? "root"
        dbPassword = UserDefaults.standard.string(forKey: "db_password") ?? ""
        dbName = UserDefaults.standard.string(forKey: "db_name") ?? "patio_carros"
        detranApiUrl = UserDefaults.standard.string(forKey: "detran_api_url") ?? ""
        detranApiKey = UserDefaults.standard.string(forKey: "detran_api_key") ?? ""
    }
}

private extension Int {
    var nonZero: Int? { self == 0 ? nil : self }
}
