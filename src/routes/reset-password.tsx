import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { meta } from "@/lib/meta";

export const Route = createFileRoute("/reset-password")({
  head: () => meta("Reset Password — SendFlow Studio", "Reset your SendFlow Studio account password."),
  component: ResetPasswordRedirect,
});

function ResetPasswordRedirect() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { token?: string };

  useEffect(() => {
    navigate({
      to: "/login",
      search: { token: search.token },
    });
  }, [navigate, search.token]);

  return null;
}

