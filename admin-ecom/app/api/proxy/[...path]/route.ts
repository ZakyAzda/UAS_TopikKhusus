/**
 * API Proxy Route Handler
 *
 * Meneruskan semua request dari browser ke backend Go via Railway internal network.
 * Browser → Next.js (Railway) → ecom-backend-go.railway.internal
 *
 * Keuntungan:
 * - Menggunakan private network Railway (lebih cepat & aman)
 * - Token JWT tidak terekspos langsung ke backend publik
 * - CORS tidak jadi masalah
 */

import { NextRequest, NextResponse } from 'next/server';


const BACKEND_INTERNAL_URL = process.env.BACKEND_INTERNAL_URL;

if (!BACKEND_INTERNAL_URL) {
  throw new Error(
    '[Proxy] Environment variable BACKEND_INTERNAL_URL belum diset. ' +
    'Tambahkan di .env.local (lokal) atau Railway Variables (production).'
  );
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, await params, 'GET');
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, await params, 'POST');
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, await params, 'PUT');
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, await params, 'PATCH');
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, await params, 'DELETE');
}

async function proxyRequest(
  req: NextRequest,
  params: { path: string[] },
  method: string
): Promise<NextResponse> {
  const pathSegments = params.path || [];
  const targetPath = '/api/' + pathSegments.join('/');

  // Teruskan query string jika ada
  const searchParams = req.nextUrl.searchParams.toString();
  const targetUrl = `${BACKEND_INTERNAL_URL}${targetPath}${searchParams ? `?${searchParams}` : ''}`;

  // Ambil headers yang relevan (terutama Authorization)
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }

  // Ambil body untuk method yang membutuhkan
  let body: string | undefined;
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    try {
      body = await req.text();
    } catch {
      body = undefined;
    }
  }

  try {
    const backendRes = await fetch(targetUrl, {
      method,
      headers,
      body,
    });

    const data = await backendRes.text();

    return new NextResponse(data, {
      status: backendRes.status,
      headers: {
        'Content-Type': backendRes.headers.get('content-type') || 'application/json',
      },
    });
  } catch (error) {
    console.error(`[Proxy Error] ${method} ${targetUrl}:`, error);
    return NextResponse.json(
      { error: 'Gagal menghubungi backend', detail: String(error) },
      { status: 502 }
    );
  }
}
