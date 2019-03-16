import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure";

// Require username and password for the webservers
const config = new pulumi.Config();
const username = config.require("username");
const password = config.require("password");

// Require Module URL for the location of the DSC Extension script to install IIS.
const moduleUrl = config.require("moduleUrl");
const websitePackageUri = config.require("websitePackageUri");

// Create an Azure Resource Group
const resourceGroup = new azure.core.ResourceGroup("pulumi", {
    location: "Southeast Asia",
});

// Create the Public IP address
const publicIP = new azure.network.PublicIp("server-one-ip", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    allocationMethod: "Dynamic"
});

// Create the VNET for the webservers
const network = new azure.network.VirtualNetwork("server-network", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    addressSpaces: ["10.0.0.0/16"],
});

// Create the webservers Subnet
const subnet = new azure.network.Subnet("server-subnet", {
    resourceGroupName: resourceGroup.name,
    virtualNetworkName: network.name,
    addressPrefix: "10.0.0.0/24",
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
const vm = new azure.compute.VirtualMachine("server-one", {
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
        name: "server-one_OSDisk",
        caching: "ReadWrite",
        createOption: "FromImage",
        managedDiskType: "Standard_LRS",
    },
    osProfile: {
        computerName: "server-one",
        adminUsername: username,
        adminPassword: password
    },
});

// Create the DSC extension to install IIS
const contosoWebsite = new azure.compute.Extension("WidgetWebsite", {
    location: resourceGroup.location,
    publisher: "Microsoft.Powershell",
    resourceGroupName: resourceGroup.name,
    settings: `{
      "modulesUrl": "${moduleUrl}",
      "configurationFunction": "WidgetWebsite.ps1\\\\WidgetWebsite",
      "properties": {
            "WebsitePackageUri": "${websitePackageUri}"
          }
    }`,
    type: "DSC",
    typeHandlerVersion: "2.19",
    autoUpgradeMinorVersion: true,
    virtualMachineName: vm.name,
});
