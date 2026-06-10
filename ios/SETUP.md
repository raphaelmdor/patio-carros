# Pátio de Carros — iOS App Setup Guide

## Prerequisites

| Tool | Minimum Version | Notes |
|------|----------------|-------|
| Xcode | 15.0+ | Available on Mac App Store |
| macOS | 14.0 (Sonoma)+ | Required by Xcode 15 |
| iOS device / Simulator | iOS 16+ | Simulator works for UI; real device needed for LAN MySQL access |
| MySQL Server | 8.0+ | The existing desktop app database |

---

## 1. Create the Xcode Project

1. Open Xcode → **File → New → Project…**
2. Choose **iOS → App** and click **Next**
3. Fill in the fields:
   - **Product Name:** `PatioCarros`
   - **Team:** (your Apple Developer account or Personal Team for local testing)
   - **Organization Identifier:** e.g. `br.com.seudominio`
   - **Bundle Identifier:** e.g. `br.com.seudominio.patiocarros`
   - **Interface:** SwiftUI
   - **Language:** Swift
   - **Use Core Data:** unchecked
   - **Include Tests:** optional
4. Choose a save location (e.g. inside the `ios/` folder of this repo) and click **Create**.

---

## 2. Add mysql-nio via Swift Package Manager

1. In Xcode, go to **File → Add Package Dependencies…**
2. In the search bar, enter:
   ```
   https://github.com/vapor/mysql-nio.git
   ```
3. Set **Dependency Rule** to **Up Next Major Version**, starting from `1.7.0`
4. Click **Add Package**
5. In the target chooser, tick **MySQLNIO** and add it to the **PatioCarros** target

> **Note:** `mysql-nio` brings in SwiftNIO as a transitive dependency. The total package graph includes `mysql-nio`, `swift-nio`, `swift-nio-ssl`, `swift-log`, and `swift-crypto`. The first SPM resolve may take a few minutes.

---

## 3. Add the Source Files

Copy (or drag-and-drop into Xcode) the entire `PatioCarros/` folder from this directory into your Xcode project. When prompted, choose:

- **Copy items if needed:** unchecked (if the folder is already inside the project directory)
- **Create groups:** selected
- **Add to targets:** `PatioCarros` (the app target)

The folder structure expected by Xcode:

```
PatioCarros/
  App/
    PatioCarrosApp.swift      ← @main entry point
    ContentView.swift         ← TabView with all 6 tabs
  Models/
    Models.swift              ← Veiculo, Movimentacao, VeiculoNoPatio, DadosDetran
  Settings/
    AppSettings.swift         ← UserDefaults-backed config (ObservableObject)
  Services/
    DatabaseService.swift     ← MySQL queries via mysql-nio (async/await)
    DetranService.swift       ← DETRAN plate lookup (real API or mock)
  Views/
    DashboardView.swift       ← Stats + recent movements
    EntradaView.swift         ← Register vehicle entry
    SaidaView.swift           ← Register vehicle exit
    PatioView.swift           ← List of vehicles currently in yard
    HistoricoView.swift       ← Full movement history with filters
    SettingsView.swift        ← DB + DETRAN API configuration
    SuccessOverlay.swift      ← Shared success feedback overlay
```

> **Remove the default generated files** (`ContentView.swift` and the `@main` App file) that Xcode created when you made the project — they will conflict with the ones in `App/`.

---

## 4. Configure Info.plist

The `Info.plist` in this repo's `ios/` directory contains the required keys. Either:

**Option A — Replace the generated plist:**
- In Xcode's Project Navigator, select `Info.plist`
- Replace its contents with the `ios/Info.plist` from this repo

**Option B — Add keys manually in Xcode's Info tab:**

| Key | Type | Value |
|-----|------|-------|
| `NSLocalNetworkUsageDescription` | String | `O app precisa acessar a rede local para conectar ao banco de dados MySQL.` |
| `NSBonjourServices` | Array → String | `_mysql._tcp` |
| `NSAppTransportSecurity` → `NSAllowsLocalNetworking` | Boolean | `YES` |
| `NSAppTransportSecurity` → `NSAllowsArbitraryLoads` | Boolean | `YES` |

> `NSAllowsArbitraryLoads` is required because mysql-nio opens a raw TCP socket to MySQL (not HTTPS). For production you should restrict this further or use TLS.

---

## 5. MySQL Server Setup

The iOS app connects **directly** to MySQL over TCP (port 3306). The MySQL server must accept connections from outside `localhost`.

### 5.1 Allow Remote Connections (my.cnf / my.ini)

Find your MySQL config file (usually `/etc/mysql/my.cnf`, `/etc/mysql/mysql.conf.d/mysqld.cnf`, or `C:\ProgramData\MySQL\MySQL Server 8.0\my.ini` on Windows):

```ini
[mysqld]
bind-address = 0.0.0.0
```

Restart MySQL:
```bash
# Linux (systemd)
sudo systemctl restart mysql

# macOS (Homebrew)
brew services restart mysql

# Windows
net stop MySQL80 && net start MySQL80
```

### 5.2 Grant Remote Access to the User

Connect to MySQL as root and run:

```sql
-- Allow the user from any host (for local network use)
CREATE USER IF NOT EXISTS 'root'@'%' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON patio_carros.* TO 'root'@'%';
FLUSH PRIVILEGES;
```

Or if you prefer a dedicated app user:

```sql
CREATE USER 'patioapp'@'%' IDENTIFIED BY 'strong_password_here';
GRANT SELECT, INSERT, UPDATE ON patio_carros.veiculos TO 'patioapp'@'%';
GRANT SELECT, INSERT ON patio_carros.movimentacoes TO 'patioapp'@'%';
FLUSH PRIVILEGES;
```

### 5.3 Firewall

Make sure port 3306 is open in your firewall for the iOS device's subnet:

```bash
# UFW (Ubuntu/Debian)
sudo ufw allow from 192.168.1.0/24 to any port 3306

# iptables
sudo iptables -A INPUT -p tcp --dport 3306 -s 192.168.1.0/24 -j ACCEPT
```

### 5.4 Find Your Server's IP Address

```bash
# Linux / macOS
ip addr show   # or: ifconfig
hostname -I

# Windows
ipconfig
```

Use this IP in the app's Settings screen (e.g. `192.168.1.100`).

---

## 6. Running the App

### Simulator

1. Select an iOS 16+ simulator in Xcode's device toolbar
2. Press **⌘R** (Run)
3. Open the **Config** tab and enter your MySQL server's LAN IP
4. Tap **Testar Conexão** — if the simulator and your Mac are on the same machine, use `127.0.0.1` or `localhost`

> The iOS Simulator shares the Mac's network stack, so `localhost` points to the Mac itself. This is the easiest way to test without a physical device.

### Physical Device

1. Connect your iPhone/iPad via USB or use wireless pairing
2. Select it in Xcode's device toolbar
3. Make sure the device is on the **same Wi-Fi network** as the MySQL server
4. Press **⌘R**
5. In the **Config** tab, enter the MySQL server's LAN IP address
6. Tap **Testar Conexão**

> On first launch iOS will show a **Local Network** permission prompt — tap **Allow**.

---

## 7. Mock DETRAN Data

If no DETRAN API key is configured, the app automatically uses mock data for these plates:

| Plate | Make | Model | Year | Color | Owner |
|-------|------|-------|------|-------|-------|
| ABC1234 | Volkswagen | Gol | 2019 | Branco | João Silva |
| XYZ5678 | Fiat | Uno | 2017 | Prata | Maria Souza |
| DEF9J12 | Chevrolet | Onix | 2022 | Preto | Carlos Pereira |
| GHI3456 | Toyota | Corolla | 2020 | Cinza | Ana Lima |
| JKL7890 | Hyundai | HB20 | 2021 | Azul | Roberto Alves |

Any other plate returns a skeleton record (`Marca: Desconhecida`) so you can still complete the entry flow.

---

## 8. Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| "Não conectado ao banco de dados" | MySQL not reachable | Check IP, port 3306 open, `bind-address = 0.0.0.0` |
| Connection times out | Firewall blocking | Open port 3306 for the device's subnet |
| "Access denied for user" | Wrong credentials or no remote grant | Run `GRANT` SQL above |
| Local network prompt never appears | iOS privacy settings | Settings → Privacy → Local Network → enable for Pátio de Carros |
| Package resolution fails | SPM cache issue | Xcode → File → Packages → Reset Package Caches |
| `MySQLNIO` not found in SPM | Wrong URL | Ensure URL is exactly `https://github.com/vapor/mysql-nio.git` |
