// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "PatioCarros",
    platforms: [.iOS(.v16), .macOS(.v13)],
    products: [
        .library(name: "PatioCarros", targets: ["PatioCarros"])
    ],
    dependencies: [
        .package(url: "https://github.com/vapor/mysql-nio.git", from: "1.7.0"),
    ],
    targets: [
        .target(
            name: "PatioCarros",
            dependencies: [
                .product(name: "MySQLNIO", package: "mysql-nio"),
            ],
            path: "PatioCarros"
        ),
        .testTarget(name: "PatioCarrosTests", dependencies: ["PatioCarros"])
    ]
)
