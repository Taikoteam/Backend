import oci
import uuid
import base64
import json

# Setup basic variables
# Auth Config
CONFIG_PROFILE = "DEFAULT"
config = {
    "user": "",
    "key_file": "",
    "fingerprint": "",
    "tenancy": "",
    "region": "us-phoenix-1",
}

# Compartment where processor job will be created (required)
COMPARTMENT_ID = ""  # e.g. "ocid1.compartment.oc1..aaaaaaaae5j73axsja5fnahbn23ilop3ynjkcg77mcvgryddz4pkh2t5ppaq";


def create_processor_job_callback(times_called, response):
    print(
        "Waiting for processor lifecycle state to go into succeeded state:",
        response.data,
    )


# Setup input location where document being processed is stored.
object_location = oci.ai_document.models.ObjectLocation()
object_location.namespace_name = ""  # e.g. "axhh9gizbq5x"
object_location.bucket_name = ""  # e.g "demo_examples"
object_location.object_name = ""  # e.g "key_value_extraction_demo.jpg

aiservicedocument_client = oci.ai_document.AIServiceDocumentClientCompositeOperations(
    oci.ai_document.AIServiceDocumentClient(config=config)
)

# Document Key-Value extraction Feature
key_value_extraction_feature = oci.ai_document.models.DocumentKeyValueExtractionFeature(
    model_id=""
)

# Setup the output location where processor job results will be created
output_location = oci.ai_document.models.OutputLocation()
output_location.namespace_name = ""  # e.g. "axk2tfhlrens"
output_location.bucket_name = ""  # e.g "output"
output_location.prefix = ""  # e.g "demo"


# Create a processor_job for invoice key_value_extraction feature.
# Note: If you want to use another key value extraction feature, set document_type to "RECIEPT" "PASSPORT" or "DRIVER_ID". If you have a mix of document types, you can remove document_type
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
        # modelId="ocid1.aidocumentmodel.oc1.phx.amaaaaaa3jtbkcyacoao6hmm2m5x7vel73vobkcj55xvyadacgvf3pwcshkq",
    ),
)

print(
    "Calling create_processor with create_processor_job_details_key_value_extraction:",
    create_processor_job_details_key_value_extraction,
)


create_processor_response = (
    aiservicedocument_client.create_processor_job_and_wait_for_state(
        create_processor_job_details=create_processor_job_details_key_value_extraction,
        wait_for_states=[oci.ai_document.models.ProcessorJob.LIFECYCLE_STATE_SUCCEEDED],
        waiter_kwargs={"wait_callback": create_processor_job_callback},
    )
)

print(
    "processor call succeeded with status: {} and request_id: {}.".format(
        create_processor_response.status, create_processor_response.request_id
    )
)

processor_job: oci.ai_document.models.ProcessorJob = create_processor_response.data
print(
    "create_processor_job_details_key_value_extraction response: ",
    create_processor_response.data,
)

# Retrieve results from object storage
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

# parse key fields from result
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
    print("")
