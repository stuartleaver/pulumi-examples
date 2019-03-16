Configuration WidgetWebsite
{
  param (
    [Parameter(Mandatory = $False)]
    [String]$WebsitePackageUri
  )

  Node 'localhost'
  {
    #Install the Web Server Role
    WindowsFeature WebServerRole
    {
      Ensure = "Present"
      Name = "Web-Server"
    }

    #Install ASP.NET 4.5
    WindowsFeature ASPNet45
    {
      Ensure = "Present"
      Name = "Web-Asp-Net45"
    }

    WindowsFeature WebServerManagementConsole
    {
      Name = "Web-Mgmt-Console"
      Ensure = "Present"
    }

    if (![String]::IsNullOrEmpty($WebsitePackageUri)) {
      # Download and unpack the website into the default website
      Script DeployWebPackage {
        GetScript  = {
          @{Result = "DeployWebPackage"}
        }

        TestScript = {
          return Test-Path -Path "C:\WebApp\WidgetWebsiteFiles.zip";
        }

        SetScript  = {

          if (!(Test-Path -Path "C:\WebApp")) {
            New-Item -Path "C:\WebApp" -ItemType Directory -Force | Out-Null;
          }

          $dest = "C:\WebApp\WidgetWebsiteFiles.zip"

          if (Test-Path -Path "C:\inetpub\wwwroot") {
            Remove-Item -Path "C:\inetpub\wwwroot" -Force -Recurse -ErrorAction SilentlyContinue | Out-Null;
          }

          if (!(Test-Path -Path "C:\inetpub\wwwroot")) {
            New-Item -Path "C:\inetpub\wwwroot" -ItemType Directory -Force | Out-Null;
          }

          [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
          Invoke-WebRequest -Uri $using:WebsitePackageUri -OutFile $dest -UseBasicParsing;

          Expand-Archive -Path $dest -DestinationPath "C:\inetpub\wwwroot" -Force;
        }

        DependsOn  = "[WindowsFeature]WebServerRole"
      }
    }
  }
}
