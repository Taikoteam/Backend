import oci
import uuid
import sys
import os
import json
import traceback

def create_processor_job_callback(times_called, response):
    print("Waiting for processor lifecycle state to go into succeeded state:", response.data)

# Uso del argumento para la ruta del archivo, si se proporciona
if len(sys.argv) > 1:
    file_path = sys.argv[1]
    print(f"Ruta del archivo recibida: {file_path}")
    print(f"Procesando archivo: {file_path}")
    #print(f"Procesando archivo: {file_path}")
else:
    print("No se proporcionó la ruta del archivo")
    sys.exit(1)

# Auth Config
CONFIG_PROFILE = "DEFAULT"
config = {
    "user": "ocid1.user.oc1..aaaaaaaazvwaqhlkymvck2ss7yeppjhv2tyo343fkxpxuwzezwz4qnyi2laa",
    "key_file": "a01379299@tec.mx_2023-11-03T18_12_12.882Z.pem",
    "fingerprint": "8a:7c:6a:01:85:03:b2:45:4a:c7:41:7f:74:cc:98:f0",
    "tenancy": "ocid1.tenancy.oc1..aaaaaaaauwv2nodivily5oo5vwrcnc3wkwhvlng24bluxr5chykix7htiloa",
    "region": "us-phoenix-1",
}


# # Verificar si se proporcionó el nombre del archivo
# if len(sys.argv) < 2:
#     print("Error: No se proporcionó el nombre del archivo.")
#     sys.exit(1)

# file_name = sys.argv[1]  # El nombre del archivo se pasa como el segundo argumento

# Verificar si se proporcionó el nombre del archivo
if len(sys.argv) < 2:
    print("Error: No se proporcionó el nombre del archivo.")
    sys.exit(1)
    
file_name = sys.argv[1]  # El nombre del archivo se pasa como el segundo argumento


print("Configuración OCI:", config)
if not os.path.exists(config["key_file"]):
    print(f"Archivo de clave no encontrado: {config['key_file']}")
    sys.exit(1)

COMPARTMENT_ID = "ocid1.tenancy.oc1..aaaaaaaauwv2nodivily5oo5vwrcnc3wkwhvlng24bluxr5chykix7htiloa"
def create_processor_job_callback(times_called, response):
    print(
        "Waiting for processor lifecycle state to go into succeeded state:",
    )
# Configuración del objeto a procesar
object_location = oci.ai_document.models.ObjectLocation()
object_location.namespace_name = "axyzzksibayy"
object_location.bucket_name = "bucket-20231101-1735"
'''object_location.object_name = (
    "documentoPrueba.pdf"  # e.g "key_value_extraction_demo.jpg
)'''
object_location.object_name = file_name

print("Creando cliente de AIServiceDocument...")
aiservicedocument_client = oci.ai_document.AIServiceDocumentClientCompositeOperations(
    oci.ai_document.AIServiceDocumentClient(config=config)
)
print("Cliente creado.")

# Configuración del objeto a procesar
print("Configurando ubicación del objeto...")
# tu código para object_location aquí
print(f"Object Location configurada: {object_location}")


# Configuración de la extracción de clave-valor
key_value_extraction_feature = oci.ai_document.models.DocumentKeyValueExtractionFeature(
    model_id="ocid1.aidocumentmodel.oc1.phx.amaaaaaa3jtbkcyacoao6hmm2m5x7vel73vobkcj55xvyadacgvf3pwcshkq"
)

# Configuración de la ubicación de salida
output_location = oci.ai_document.models.OutputLocation()
output_location.namespace_name = "axyzzksibayy"
output_location.bucket_name = "bucket-20231101-1735"
output_location.prefix = "esquizo"

print("Creando trabajo del procesador...")
# Creación del trabajo del procesador
create_processor_job_details_key_value_extraction = oci.ai_document.models.CreateProcessorJobDetails(
    display_name=str(uuid.uuid4()),
    compartment_id=COMPARTMENT_ID,
    input_location=oci.ai_document.models.ObjectStorageLocations(
        object_locations=[object_location]
    ),
    output_location=output_location,
    processor_config=oci.ai_document.models.GeneralProcessorConfig(
        features=[key_value_extraction_feature],
        document_type="INVOICE",
        language="ENG",
    ),
)
print("Detalles del trabajo del procesador:", create_processor_job_details_key_value_extraction)
print(f"Verificando acceso al archivo de clave: {config['key_file']}")
if os.path.exists(config["key_file"]):
    print("Archivo de clave encontrado.")
else:
    print("Archivo de clave NO encontrado.")
    sys.exit(1)

try:
    create_processor_response = aiservicedocument_client.create_processor_job_and_wait_for_state(
        create_processor_job_details=create_processor_job_details_key_value_extraction,
        wait_for_states=[oci.ai_document.models.ProcessorJob.LIFECYCLE_STATE_SUCCEEDED],
        waiter_kwargs={"wait_callback": create_processor_job_callback},
    )
    print("Respuesta del procesador:", create_processor_response)
    print("Trabajo del procesador creado.")
except Exception as e:
    #print(f"Error al crear el trabajo del procesador: {str(e)}")
    print(f"Error al procesar el archivo: {str(e)}")
    traceback.print_exc()
    sys.exit(1)

processor_job = create_processor_response.data
print("create_processor_job_details_key_value_extraction response:", processor_job)

# Recuperación de resultados desde Object Storage
print("Getting defaultObject.json from the output_location")
object_storage_client = oci.object_storage.ObjectStorageClient(config=config)
get_object_response = object_storage_client.get_object(
    namespace_name=output_location.namespace_name,
    bucket_name=output_location.bucket_name,
    object_name="{}/{}/{}_{}/results/{}.json".format(
        output_location.prefix,
        processor_job.id,
        object_location.namespace_name,
        object_location.bucket_name,
        object_location.object_name,
    ),
)

# Análisis de los campos clave desde el resultado
response = json.loads(str(get_object_response.data.content.decode()))
KV = response["pages"][0]["documentFields"]
for KVdata in KV:
    if KVdata["fieldType"] == "KEY_VALUE":
        KVlabelname = KVdata["fieldLabel"]["name"]
        KVvaluedata = KVdata["fieldValue"]
        KVvaluename = KVvaluedata["value"]
        print(KVlabelname, KVvaluename)
    else:
        KVlabelname = KVdata["fieldValue"]["items"]
        for i in KVlabelname:
            iFieldValuesItems = i["fieldValue"]["items"]
            for item in iFieldValuesItems:
                fieldLabelName = item["fieldLabel"]["name"]
                fieldLabelValue = item["fieldValue"]["value"]
                print(fieldLabelName, fieldLabelValue)
print("Recuperando resultados desde Object Storage...")
print("Resultados recuperados.")