# Crea la llave fija de firma de PokéPrecio (PKCS12) y la sube como secretos del repo.
import base64, datetime, os, secrets, subprocess, shutil
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import pkcs12

carpeta = os.path.join(os.environ["LOCALAPPDATA"], "PokePrecio", "firma")
os.makedirs(carpeta, exist_ok=True)
ruta = os.path.join(carpeta, "pokeprecio.p12")
if os.path.exists(ruta):
    raise SystemExit("Ya existe la llave; no se sobrescribe: " + ruta)

clave = secrets.token_urlsafe(24)
alias = "pokeprecio"
k = rsa.generate_private_key(public_exponent=65537, key_size=2048)
nombre = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "PokePrecio"), x509.NameAttribute(NameOID.COUNTRY_NAME, "CO")])
ahora = datetime.datetime.now(datetime.timezone.utc)
cert = (x509.CertificateBuilder().subject_name(nombre).issuer_name(nombre).public_key(k.public_key())
        .serial_number(x509.random_serial_number()).not_valid_before(ahora - datetime.timedelta(days=1))
        .not_valid_after(ahora + datetime.timedelta(days=365 * 40)).sign(k, hashes.SHA256()))
cifrado = (serialization.PrivateFormat.PKCS12.encryption_builder()
           .kdf_rounds(50000).key_cert_algorithm(pkcs12.PBES.PBESv2SHA256AndAES256CBC)
           .hmac_hash(hashes.SHA256()).build(clave.encode()))
datos = pkcs12.serialize_key_and_certificates(alias.encode(), k, cert, None, cifrado)
open(ruta, "wb").write(datos)
open(os.path.join(carpeta, "LEEME.txt"), "w", encoding="utf-8").write(
    "Llave de firma de PokéPrecio. NO BORRAR: sin ella, las actualizaciones de la app no se pueden instalar\n"
    "encima de la versión anterior (y se perdería la colección al reinstalar).\n"
    f"Alias: {alias}\nContraseña: {clave}\nTambién está guardada como secretos del repo hulldrapro/pokeprecio.\n")

gh = shutil.which("gh")
def secreto(nombre, valor):
    subprocess.run([gh, "secret", "set", nombre, "-R", "hulldrapro/pokeprecio"], input=valor.encode(), check=True)
secreto("KEYSTORE_B64", base64.b64encode(datos).decode())
secreto("KEYSTORE_PASSWORD", clave)
secreto("KEY_ALIAS", alias)
print("Llave creada en", ruta, "y secretos subidos")
