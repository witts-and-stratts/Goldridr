import fs from "fs";
import path from "path";
import PocketBase from "pocketbase";

function loadEnvFile( filePath: string ): void {
  if ( !fs.existsSync( filePath ) ) return;
  for ( const line of fs.readFileSync( filePath, "utf8" ).split( /\r?\n/ ) ) {
    const trimmed = line.trim();
    if ( !trimmed || trimmed.startsWith( "#" ) ) continue;
    const index = trimmed.indexOf( "=" );
    if ( index <= 0 ) continue;
    const key = trimmed.slice( 0, index ).trim();
    if ( process.env[ key ] === undefined ) process.env[ key ] = trimmed.slice( index + 1 );
  }
}

loadEnvFile( path.join( process.cwd(), ".env" ) );
loadEnvFile( path.join( process.cwd(), ".env.local" ) );

function requiredEnv( name: string ): string {
  const value = process.env[ name ]?.trim();
  if ( !value ) throw new Error( `${ name } is required` );
  return value;
}

async function main() {
  const pb = new PocketBase( requiredEnv( "POCKETBASE_URL" ).replace( /\/$/, "" ) );
  pb.authStore.save( requiredEnv( "POCKETBASE_SUPERUSER_TOKEN" ) );
  const timestamp = new Date().toISOString().replace( /[:.]/g, "-" );
  const name = `goldridr-${ timestamp }.zip`;
  await pb.backups.create( name );
  console.log( name );
}

main().catch( error => {
  console.error( error );
  process.exitCode = 1;
} );
