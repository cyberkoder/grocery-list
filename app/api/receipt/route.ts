import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://ollama.whitetailnas.app";

interface ParsedItem {
  name: string;
  quantity: number;
  price?: number;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: "Image is required" },
        { status: 400 }
      );
    }

    // Call Ollama with vision model to parse receipt
    const ollamaResponse = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llava",
        prompt: `You are a receipt parser. Analyze this grocery receipt image and extract all the items purchased.

For each item, provide:
- name: The product name (clean it up to be readable, e.g., "MILK 2%" becomes "Milk 2%")
- quantity: The quantity purchased (default to 1 if not specified)
- price: The price if visible (optional)

Return ONLY a valid JSON array of items, nothing else. Example:
[{"name": "Milk 2%", "quantity": 1, "price": 4.99}, {"name": "Bread", "quantity": 2, "price": 3.49}]

If you cannot read the receipt or find no items, return an empty array: []`,
        images: [image],
        stream: false,
      }),
    });

    if (!ollamaResponse.ok) {
      console.error("Ollama error:", await ollamaResponse.text());
      return NextResponse.json(
        { error: "AI processing failed" },
        { status: 500 }
      );
    }

    const ollamaData = await ollamaResponse.json();
    const responseText = ollamaData.response || "";

    // Parse the JSON from the response
    let items: ParsedItem[] = [];
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        items = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", responseText);
    }

    // Clean up and validate items
    items = items
      .filter((item: any) => item.name && typeof item.name === "string")
      .map((item: any) => ({
        name: String(item.name).trim(),
        quantity: Math.max(1, parseInt(item.quantity) || 1),
        price: item.price ? parseFloat(item.price) : undefined,
      }));

    return NextResponse.json({ items, raw: responseText });
  } catch (error) {
    console.error("Receipt processing error:", error);
    return NextResponse.json(
      { error: "Failed to process receipt" },
      { status: 500 }
    );
  }
}
