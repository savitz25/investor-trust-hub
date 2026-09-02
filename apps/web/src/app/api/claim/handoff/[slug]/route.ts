import {
  claimEnabled,
  claimProfile,
  handoffRedirect,
  mintInvestorHandoff,
} from "@/lib/customer-integration/core";
export const runtime = "nodejs",
  dynamic = "force-dynamic";
const H = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };
export async function GET(
  _r: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params,
      p = await claimProfile(slug);
    if (!p || !claimEnabled(p.nativeProfileId!))
      return Response.json(
        {
          error: "Profile management is unavailable.",
          nextActions: [
            "Return to the firm profile",
            "Search by organization CRD",
            "Contact AskTrustHub support",
          ],
        },
        { status: 404, headers: H },
      );
    return handoffRedirect(
      mintInvestorHandoff(process.env.ATH_HANDOFF_SECRET || "", p).token,
    );
  } catch {
    return Response.json(
      {
        error: "Profile management is temporarily unavailable.",
        nextActions: [
          "Try again later",
          "Continue researching InvestorTrustHub",
          "Contact AskTrustHub support",
        ],
      },
      { status: 503, headers: H },
    );
  }
}
