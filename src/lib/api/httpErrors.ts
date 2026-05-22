export const getAuthRedirectPath = (status: number, currentPath: string): string | null => {
  if (status === 401 && currentPath !== "/login") {
    return "/login";
  }
  if (status === 403 && currentPath !== "/403") {
    return "/403";
  }
  return null;
};