const oda = require("oci-oda");
const common = require("oci-common");

// Create a default authentication provider that uses the DEFAULT
// profile in the configuration file.
// Refer to the public documentation on how to prepare a configuration file.
const provider = new common.ConfigFileAuthenticationDetailsProvider();

(async () => {
  try {
    // Create a service client
    const client = new oda.ManagementClient({ authenticationDetailsProvider: provider });

    // Create a request and dependent object(s).
    const getChannelRequest = {
      odaInstanceId: "",
      channelId: ""
    };

    // Send request to the Client.
    const getChannelResponse = await client.getChannel(getChannelRequest);
  } catch (error) {
    console.log("getChannel Failed with error  " + error);
  }
})();
