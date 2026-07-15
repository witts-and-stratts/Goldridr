import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { isAdmin } from "@/lib/auth";
import {
  assignVehicleToChauffeur,
  createChauffeur,
  deleteChauffeur,
  getAllChauffeurs,
  getChauffeurById,
  updateChauffeur,
  updateChauffeurAvatar,
  unassignVehicle,
} from "@/lib/pocketbase/repository";
import { getRequestSession } from "@/lib/driver-auth";

const MAX_AVATAR_BYTES = 3 * 1024 * 1024;
const AVATAR_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function assertAvatarFile( file: File ): void {
  if ( file.size > MAX_AVATAR_BYTES ) {
    throw new Error( "Avatar image must be 3 MB or smaller" );
  }

  if ( !AVATAR_EXTENSIONS[ file.type ] ) {
    throw new Error( "Avatar image must be a JPG, PNG, WebP, or GIF" );
  }
}

async function saveAvatarFile( file: File, chauffeurId: string ): Promise<string> {
  assertAvatarFile( file );
  const extension = AVATAR_EXTENSIONS[ file.type ];

  const bytes = Buffer.from( await file.arrayBuffer() );
  const uploadDir = path.join( process.cwd(), "public", "uploads", "chauffeurs" );
  await mkdir( uploadDir, { recursive: true } );

  const filename = `${ chauffeurId }-${ randomUUID() }.${ extension }`;
  await writeFile( path.join( uploadDir, filename ), bytes );
  return `/uploads/chauffeurs/${ filename }`;
}

async function deleteLocalAvatarFile( avatarUrl?: string | null ): Promise<void> {
  if ( !avatarUrl?.startsWith( "/uploads/chauffeurs/" ) ) return;
  try {
    await unlink( path.join( process.cwd(), "public", avatarUrl ) );
  } catch {}
}

export async function GET( req: Request ) {
  try {
    const session = await getRequestSession( req );
    if ( !session ) {
      return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
    }
    if ( !isAdmin( session ) ) {
      return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );
    }
    const chauffeurs = await getAllChauffeurs();
    return NextResponse.json( { success: true, chauffeurs } );
  } catch ( err: unknown ) {
    const message = err instanceof Error ? err.message : "Failed to retrieve chauffeurs list";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST( req: Request ) {
  try {
    const session = await getRequestSession( req );
    if ( !session ) {
      return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
    }
    if ( !isAdmin( session ) ) {
      return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );
    }

    const contentType = req.headers.get( "content-type" ) ?? "";
    const body = contentType.includes( "multipart/form-data" )
      ? await req.formData()
      : await req.json();

    const getString = ( key: string ) => {
      const value = body instanceof FormData ? body.get( key ) : body[ key ];
      return typeof value === "string" ? value : "";
    };

    const name = getString( "name" ).trim();
    const email = getString( "email" ).trim().toLowerCase();
    const phone = getString( "phone" ).trim();
    const password = getString( "password" );

    if ( !name || !email || !password ) {
      return NextResponse.json(
        { success: false, error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if ( !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test( email ) ) {
      return NextResponse.json(
        { success: false, error: "Enter a valid email address" },
        { status: 400 }
      );
    }

    if ( password.length < 8 ) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const avatar = body instanceof FormData ? body.get( "avatar" ) : null;
    if ( avatar instanceof File && avatar.size > 0 ) {
      assertAvatarFile( avatar );
    }

    let chauffeur = await createChauffeur( { name, email, phone, password } );
    if ( avatar instanceof File && avatar.size > 0 ) {
      const avatarUrl = await saveAvatarFile( avatar, chauffeur.id );
      chauffeur = await updateChauffeurAvatar( chauffeur.id, avatarUrl ) ?? chauffeur;
    }

    return NextResponse.json( { success: true, chauffeur }, { status: 201 } );
  } catch ( err: unknown ) {
    const message = err instanceof Error ? err.message : "Failed to add chauffeur";
    const status = message.includes( "already exists" ) ? 409 : 500;
    return NextResponse.json( { success: false, error: message }, { status } );
  }
}

export async function PATCH( req: Request ) {
  try {
    const session = await getRequestSession( req );
    if ( !session ) return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
    if ( !isAdmin( session ) ) return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );

    const contentType = req.headers.get( "content-type" ) ?? "";
    const body = contentType.includes( "multipart/form-data" )
      ? await req.formData()
      : await req.json();

    const getValue = ( key: string ) => body instanceof FormData ? body.get( key ) : body[ key ];
    const idValue = getValue( "id" );
    const chauffeurId = typeof idValue === "string" ? idValue.trim() : "";
    if ( !chauffeurId ) {
      return NextResponse.json( { success: false, error: "A valid chauffeur id is required" }, { status: 400 } );
    }

    if ( body instanceof FormData ) {
      const avatar = body.get( "avatar" );
      if ( !( avatar instanceof File ) || avatar.size === 0 ) {
        return NextResponse.json( { success: false, error: "Avatar image is required" }, { status: 400 } );
      }

      const existing = await getChauffeurById( chauffeurId );
      if ( !existing ) {
        return NextResponse.json( { success: false, error: "Chauffeur not found" }, { status: 404 } );
      }

      const avatarUrl = await saveAvatarFile( avatar, chauffeurId );
      const updated = await updateChauffeurAvatar( chauffeurId, avatarUrl );
      await deleteLocalAvatarFile( existing.avatarUrl );
      return NextResponse.json( { success: true, chauffeur: updated } );
    }

    if ( "vehicleId" in body ) {
      const vehicleId = body.vehicleId == null ? null : Number( body.vehicleId );
      if ( vehicleId !== null && ( !Number.isInteger( vehicleId ) || vehicleId <= 0 ) ) {
        return NextResponse.json( { success: false, error: "Invalid vehicle id" }, { status: 400 } );
      }
      try {
        if ( vehicleId === null ) {
          const current = await getChauffeurById( chauffeurId );
          if ( current?.vehicleId ) await unassignVehicle( current.vehicleId );
        } else {
          await assignVehicleToChauffeur( chauffeurId, vehicleId );
        }
      } catch ( err: unknown ) {
        const message = err instanceof Error ? err.message : "Failed to assign vehicle";
        return NextResponse.json( { success: false, error: message }, { status: 400 } );
      }
      const chauffeurs = await getAllChauffeurs();
      const updated = chauffeurs.find( c => c.id === chauffeurId );
      return NextResponse.json( { success: true, chauffeur: updated } );
    }

    const hasUpdateFields =
      "name" in body ||
      "email" in body ||
      "phone" in body ||
      "password" in body;

    if ( hasUpdateFields ) {
      const name = typeof body.name === "string" ? body.name.trim() : undefined;
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : undefined;
      const phone = "phone" in body
        ? body.phone == null
          ? null
          : typeof body.phone === "string"
            ? body.phone.trim()
            : ""
        : undefined;
      const password = typeof body.password === "string" ? body.password : undefined;

      if ( name === "" || email === "" ) {
        return NextResponse.json( { success: false, error: "Name and email cannot be empty" }, { status: 400 } );
      }
      if ( password !== undefined && password !== "" && password.length < 8 ) {
        return NextResponse.json( { success: false, error: "Password must be at least 8 characters" }, { status: 400 } );
      }

      try {
        const updated = await updateChauffeur( chauffeurId, {
          name,
          email,
          phone,
          password: password && password.trim() ? password : null,
        } );
        if ( !updated ) {
          return NextResponse.json( { success: false, error: "Chauffeur not found" }, { status: 404 } );
        }
        return NextResponse.json( { success: true, chauffeur: updated } );
      } catch ( err: unknown ) {
        const message = err instanceof Error ? err.message : "Failed to update chauffeur";
        const status = message.includes( "already exists" ) ? 409 : 400;
        return NextResponse.json( { success: false, error: message }, { status } );
      }
    }

    return NextResponse.json( { success: false, error: "Nothing to update" }, { status: 400 } );
  } catch ( err: unknown ) {
    const message = err instanceof Error ? err.message : "Failed to update chauffeur";
    return NextResponse.json( { success: false, error: message }, { status: 500 } );
  }
}

export async function DELETE( req: Request ) {
  try {
    const session = await getRequestSession( req );
    if ( !session ) {
      return NextResponse.json( { success: false, error: "Unauthenticated" }, { status: 401 } );
    }
    if ( !isAdmin( session ) ) {
      return NextResponse.json( { success: false, error: "Forbidden" }, { status: 403 } );
    }

    const { searchParams } = new URL( req.url );
    const id = searchParams.get( "id" )?.trim() || "";

    if ( !id ) {
      return NextResponse.json(
        { success: false, error: "A valid chauffeur id is required" },
        { status: 400 }
      );
    }

    if ( !await deleteChauffeur( id ) ) {
      return NextResponse.json(
        { success: false, error: "Chauffeur not found" },
        { status: 404 }
      );
    }

    return NextResponse.json( { success: true } );
  } catch ( err: unknown ) {
    const message = err instanceof Error ? err.message : "Failed to delete chauffeur";
    return NextResponse.json( { success: false, error: message }, { status: 500 } );
  }
}
