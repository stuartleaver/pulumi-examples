import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure";

// Require username and password for the webservers
const config = new pulumi.Config();
const username = config.require("username");
const password = config.require("password");

// Create an Azure Resource Group
const resourceGroup = new azure.core.ResourceGroup("pulumi", {
    location: "Southeast Asia",
});

// Create an Azure resource (Storage Account)
const account = new azure.storage.Account("storage", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    accountTier: "Standard",
    accountReplicationType: "LRS",
});

// Create the VNET for the webservers
const network = new azure.network.VirtualNetwork("server-network", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    addressSpaces: ["10.0.0.0/16"],
    // Workaround two issues:
    // (1) The Azure API recently regressed and now fails when no subnets are defined at Network creation time.
    // (2) The Azure Terraform provider does not return the ID of the created subnets - so this cannot actually be used.
    subnets: [{
        name: "default",
        addressPrefix: "10.0.1.0/24",
    }],
});

// Create the webservers Subnet
const subnet = new azure.network.Subnet("server-subnet", {
    resourceGroupName: resourceGroup.name,
    virtualNetworkName: network.name,
    addressPrefix: "10.0.2.0/24",
});

// Create the Public IP address
const publicIP = new azure.network.PublicIp("server-one-ip", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    allocationMethod: "Static"
});

// Create the NIC for the webserver
const networkInterface = new azure.network.NetworkInterface("server-one-nic", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    ipConfigurations: [{
        name: "webserveripcfg",
        subnetId: subnet.id,
        privateIpAddressAllocation: "Dynamic",
        publicIpAddressId: publicIP.id,
    }],
});

// Create the VM
const vm = new azure.compute.VirtualMachine("webserver-one", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    vmSize: "Standard_B2ms",
    networkInterfaceIds: [networkInterface.id],
    storageImageReference: {
        publisher: "MicrosoftWindowsServer",
        offer: "WindowsServer",
        sku: "2016-Datacenter",
        version: "latest"
    },
    osProfileWindowsConfig: {
        enableAutomaticUpgrades: true,
        provisionVmAgent: true
    },
    storageOsDisk: {
        name: "osdisk",
        createOption: "FromImage"
    },
    osProfile: {
        computerName: "webserver-one",
        adminUsername: username,
        adminPassword: password
    },
});
