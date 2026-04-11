import { calculateScore } from "../../lib/scoreCalculator";
import { NextResponse } from "next/server";

export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const usernames = searchParams.getAll("username");

    if (!usernames || usernames.length < 2) {
      return NextResponse.json(
        { success: false, error: "Please provide two usernames" },
        { status: 400 }
      );
    }

    const results = await Promise.all(
      usernames.map(async (username) => {
        try {
          return await calculateScore(username);
        } catch (error: any) {
          throw new Error(
            error?.message === "User not found" ? "User not found" : error?.message
          );
        }
      })
    );

    return NextResponse.json({ success: true, users: results });
  } catch (error: any) {
    console.error("GitHub score error:", error);

    let message = "Something went wrong. Please try again later.";
    let status = 500;

    const msg = error?.message ?? "";
    if (msg === "User not found") {
      message = "One or more GitHub users could not be found. Please check the usernames and try again.";
      status = 404;
    } else if (
      msg.includes("rate limit") ||
      msg.includes("API rate limit") ||
      error?.status === 403
    ) {
      message = "GitHub API rate limit exceeded. Please wait a few minutes and try again.";
      status = 429;
    } else if (
      msg.includes("ENOTFOUND") ||
      msg.includes("ECONNREFUSED") ||
      msg.includes("fetch failed")
    ) {
      message = "Unable to reach GitHub. Please check your internet connection and try again.";
      status = 503;
    }

    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
