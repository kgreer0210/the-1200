import { getAllUsers, promoteToAdmin, demoteFromAdmin } from "./actions";
import { Button } from "@/components/ui/button";
import { isAdmin } from "@/lib/supabase/admin";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  // Check if user is admin
  const admin = await isAdmin();

  if (!admin) {
    redirect("/");
  }

  const result = await getAllUsers();

  if ("error" in result) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
        <div className="text-destructive">{result.error}</div>
      </div>
    );
  }

  const users = result.data || [];

  // Form action wrappers
  async function handlePromote(formData: FormData) {
    "use server";
    const userId = formData.get("userId") as string;
    await promoteToAdmin(userId);
  }

  async function handleDemote(formData: FormData) {
    "use server";
    const userId = formData.get("userId") as string;
    await demoteFromAdmin(userId);
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to dashboard
        </Link>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Manage users and their roles</p>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">Users</h2>

          {users.length === 0 ? (
            <p className="text-muted-foreground">No users found</p>
          ) : (
            <>
              {/* Mobile Card Layout */}
              <div className="block md:hidden space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="rounded-lg border bg-muted/50 p-4 space-y-3">
                    <div>
                      <div className="font-medium mb-1">
                        {user.first_name && user.last_name
                          ? `${user.first_name} ${user.last_name}`
                          : user.email || "Not set"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.email || "—"}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          user.role === "admin"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                        }`}
                      >
                        {user.role}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      {user.role === "admin" ? (
                        <form action={handleDemote}>
                          <input
                            type="hidden"
                            name="userId"
                            value={user.id}
                          />
                          <Button type="submit" variant="outline" size="sm" className="w-full">
                            Demote to Customer
                          </Button>
                        </form>
                      ) : (
                        <form action={handlePromote}>
                          <input
                            type="hidden"
                            name="userId"
                            value={user.id}
                          />
                          <Button type="submit" variant="default" size="sm" className="w-full">
                            Promote to Admin
                          </Button>
                        </form>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">Email</th>
                      <th className="text-left p-3 font-medium">Role</th>
                      <th className="text-left p-3 font-medium">Created</th>
                      <th className="text-left p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b">
                        <td className="p-3">
                          {user.first_name && user.last_name
                            ? `${user.first_name} ${user.last_name}`
                            : user.email || "Not set"}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {user.email || "—"}
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              user.role === "admin"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          {user.role === "admin" ? (
                            <form action={handleDemote}>
                              <input
                                type="hidden"
                                name="userId"
                                value={user.id}
                              />
                              <Button type="submit" variant="outline" size="sm">
                                Demote to Customer
                              </Button>
                            </form>
                          ) : (
                            <form action={handlePromote}>
                              <input
                                type="hidden"
                                name="userId"
                                value={user.id}
                              />
                              <Button type="submit" variant="default" size="sm">
                                Promote to Admin
                              </Button>
                            </form>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-lg border bg-card p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-2">System Statistics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <div className="text-2xl font-bold">{users.length}</div>
            <div className="text-sm text-muted-foreground">Total Users</div>
          </div>
          <div>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.role === "admin").length}
            </div>
            <div className="text-sm text-muted-foreground">Admins</div>
          </div>
          <div>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.role === "customer").length}
            </div>
            <div className="text-sm text-muted-foreground">Customers</div>
          </div>
        </div>
      </div>
    </div>
  );
}
