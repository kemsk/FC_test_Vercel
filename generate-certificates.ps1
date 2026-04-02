# Generate self-signed SSL certificates for HTTPS
# This script creates cert.pem and key.pem for the nginx HTTPS configuration

Write-Host "Generating SSL certificates for HTTPS..."

# Check if OpenSSL is available in Git for Windows or other locations
$opensslPaths = @(
    "C:\Program Files\Git\usr\bin\openssl.exe",
    "C:\Program Files (x86)\Git\usr\bin\openssl.exe",
    "openssl.exe"
)

$openssl = $null
foreach ($path in $opensslPaths) {
    if (Test-Path $path) {
        $openssl = $path
        break
    }
}

if (-not $openssl) {
    Write-Error "OpenSSL not found. Please install OpenSSL or Git for Windows."
    exit 1
}

# Generate the certificates
& $openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
    -keyout key.pem `
    -out cert.pem `
    -subj "/C=PH/ST=Manila/L=Quezon City/O=Xavier University/CN=localhost"

if ($LASTEXITCODE -eq 0) {
    Write-Host "SSL certificates generated successfully!"
    Write-Host "Files created: cert.pem, key.pem"
} else {
    Write-Error "Failed to generate certificates."
    exit 1
}
