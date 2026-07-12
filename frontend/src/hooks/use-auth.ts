import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiFetch, apiFetchForm } from "@/lib/api-client";
import { useAuthStore, type IUser } from "@/lib/auth-store";

interface ITokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const form = new URLSearchParams({ username: email, password });
      const tokens = await apiFetchForm<ITokenResponse>("/auth/login", form);
      setSession({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token });
      const user = await apiFetch<IUser>("/users/me");
      setUser(user);
      return user;
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (input: { email: string; password: string; full_name: string }) =>
      apiFetch<IUser>("/users", { method: "POST", body: input, skipAuth: true }),
  });
}

export function useCurrentUser() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<IUser>("/users/me"),
    enabled: !!accessToken,
  });
}

export function useLogout() {
  const clearSession = useAuthStore((s) => s.clearSession);
  const queryClient = useQueryClient();
  const router = useRouter();

  return () => {
    clearSession();
    queryClient.clear();
    router.push("/login");
  };
}
