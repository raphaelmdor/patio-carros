import Foundation

struct DetranService {
    private static let mockData: [String: DadosDetran] = [
        "ABC1234": DadosDetran(
            placa: "ABC1234", marca: "Volkswagen", modelo: "Gol",
            ano: 2019, cor: "Branco", proprietario: "João Silva"
        ),
        "XYZ5678": DadosDetran(
            placa: "XYZ5678", marca: "Fiat", modelo: "Uno",
            ano: 2017, cor: "Prata", proprietario: "Maria Souza"
        ),
        "DEF9J12": DadosDetran(
            placa: "DEF9J12", marca: "Chevrolet", modelo: "Onix",
            ano: 2022, cor: "Preto", proprietario: "Carlos Pereira"
        ),
        "GHI3456": DadosDetran(
            placa: "GHI3456", marca: "Toyota", modelo: "Corolla",
            ano: 2020, cor: "Cinza", proprietario: "Ana Lima"
        ),
        "JKL7890": DadosDetran(
            placa: "JKL7890", marca: "Hyundai", modelo: "HB20",
            ano: 2021, cor: "Azul", proprietario: "Roberto Alves"
        ),
    ]

    /// Queries DETRAN for vehicle data. Falls back to mock data when no API key is configured.
    static func consultar(placa: String) async throws -> DadosDetran {
        let normalized = placa.uppercased().replacingOccurrences(of: "-", with: "")
        let s = AppSettings.shared

        if !s.detranApiKey.isEmpty, let url = URL(string: "\(s.detranApiUrl)/\(normalized)") {
            return try await consultarAPI(url: url, key: s.detranApiKey, placa: normalized)
        }

        // Simulated network delay (300 ms)
        try await Task.sleep(nanoseconds: 300_000_000)

        if let mock = mockData[normalized] {
            return mock
        }

        // Unknown plate: return skeleton with only the plate filled in
        return DadosDetran(
            placa: normalized,
            marca: "Desconhecida",
            modelo: "Desconhecido",
            ano: nil,
            cor: nil,
            proprietario: nil
        )
    }

    private static func consultarAPI(url: URL, key: String, placa: String) async throws -> DadosDetran {
        var req = URLRequest(url: url)
        req.setValue(key, forHTTPHeaderField: "Authorization")
        let (data, _) = try await URLSession.shared.data(for: req)
        let json = (try? JSONSerialization.jsonObject(with: data) as? [String: Any]) ?? [:]
        return DadosDetran(
            placa: placa,
            marca: json["marca"] as? String ?? json["MARCA"] as? String ?? "",
            modelo: json["modelo"] as? String ?? json["MODELO"] as? String ?? "",
            ano: json["ano"] as? Int ?? json["ANO"] as? Int,
            cor: json["cor"] as? String ?? json["COR"] as? String,
            proprietario: json["proprietario"] as? String ?? json["PROPRIETARIO"] as? String
        )
    }
}
