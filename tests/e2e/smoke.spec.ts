import { expect, test } from "@playwright/test";

test("login page renders without env", async ({ page }) => {
  await page.goto("/auth/login");
  await expect(page.getByText("QFactor A股量化驾驶舱")).toBeVisible();
});

test("dashboard renders public shell", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "A股量化驾驶舱", level: 1 })).toBeVisible();
});
