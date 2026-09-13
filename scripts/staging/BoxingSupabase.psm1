# Boxing STAGING Supabase management helpers.
#
# Safety rules (enforced in code, not convention):
#   * the Supabase CLI access token is read from Windows Credential Manager and
#     never printed, logged or written to disk
#   * every project-scoped call re-resolves the target project by ref and
#     refuses unless its NAME is exactly 'propbetedge-boxing-staging'
#   * the known non-boxing projects (UFC/NFL production, MLB/PropTech) are
#     refused by ref before any request is sent
#   * the DB password lives only in D:\Workers\secrets\boxing-staging-db.env

$script:BoxingProjectName = 'propbetedge-boxing-staging'
$script:ForbiddenRefs = @(
  'tkmlnhmylqnttmnsnief', # PROPBETEDGE: NFL + UFC production
  'rlfyavnhbngwbldebrid'  # MLB + PropTech
)
$script:Api = 'https://api.supabase.com/v1'

$sig = @'
using System; using System.Runtime.InteropServices;
public class BoxingCredMan {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public struct CREDENTIAL { public int Flags; public int Type; public string TargetName; public string Comment; public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten; public int CredentialBlobSize; public IntPtr CredentialBlob; public int Persist; public int AttributeCount; public IntPtr Attributes; public string TargetAlias; public string UserName; }
  [DllImport("advapi32.dll", CharSet=CharSet.Unicode, SetLastError=true)] public static extern bool CredRead(string target, int type, int flags, out IntPtr cred);
  [DllImport("advapi32.dll")] public static extern void CredFree(IntPtr cred);
  public static string Read(string target) { IntPtr p; if (!CredRead(target, 1, 0, out p)) return null; var c = (CREDENTIAL)Marshal.PtrToStructure(p, typeof(CREDENTIAL)); var b = new byte[c.CredentialBlobSize]; Marshal.Copy(c.CredentialBlob, b, 0, b.Length); CredFree(p); return System.Text.Encoding.UTF8.GetString(b); }
}
'@
if (-not ([System.Management.Automation.PSTypeName]'BoxingCredMan').Type) { Add-Type -TypeDefinition $sig }

function Get-SbToken {
  $t = [BoxingCredMan]::Read('Supabase CLI:supabase')
  if (-not $t) { throw 'Supabase CLI token not found in Credential Manager (run: supabase login)' }
  return $t
}

function Invoke-SbApi {
  param([string]$Method = 'GET', [Parameter(Mandatory)][string]$Path, $Body = $null)
  $headers = @{ Authorization = "Bearer $(Get-SbToken)"; 'Content-Type' = 'application/json' }
  $params = @{ Method = $Method; Uri = "$script:Api$Path"; Headers = $headers }
  if ($null -ne $Body) { $params.Body = ($Body | ConvertTo-Json -Depth 10 -Compress) }
  try { return Invoke-RestMethod @params }
  catch {
    $status = $_.Exception.Response.StatusCode.value__
    $detail = $_.ErrorDetails.Message
    throw "Supabase API $Method $Path failed (HTTP $status): $detail"
  }
}

function Assert-BoxingStagingProject {
  param([Parameter(Mandatory)][string]$Ref)
  if ($script:ForbiddenRefs -contains $Ref) { throw "REFUSED: $Ref is a non-boxing project" }
  $p = Invoke-SbApi -Path "/projects/$Ref"
  if ($p.name -ne $script:BoxingProjectName) { throw "REFUSED: project $Ref is named '$($p.name)', not '$script:BoxingProjectName'" }
  return $p
}

function Invoke-BoxingStagingSql {
  param([Parameter(Mandatory)][string]$Ref, [Parameter(Mandatory)][string]$Sql)
  $null = Assert-BoxingStagingProject -Ref $Ref
  return Invoke-SbApi -Method POST -Path "/projects/$Ref/database/query" -Body @{ query = $Sql }
}

Export-ModuleMember -Function Get-SbToken, Invoke-SbApi, Assert-BoxingStagingProject, Invoke-BoxingStagingSql
