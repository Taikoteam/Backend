import oracledb

# Contrasena bd
password = "pruebaTaiko1"

# Contrasena wallet
wallet_pw= "KnjiTaiko1"
def conexionBD():
    try:
        print("Conectando a la base de datos...")
        # Conexion a la bd
        connection=oracledb.connect(
        user="admin",
        password=password,
        # Servidor al que se quiere conectar (existe high, low, medium, tp, tpurgent)
        dsn="vrsy5n2bnqg4crf5_medium",
        # Directorio donde se encuentran las claves
        config_dir="Docs",
        wallet_location="Docs",
        wallet_password=wallet_pw)
        
        print("✅ Conexión exitosa a la base de datos Oracle. ")
        
        cursor = connection.cursor()
        
    except oracledb.Error as e:
        print(f"Error de conexión a la base de datos: {e}")
