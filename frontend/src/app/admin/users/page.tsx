"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import type { UserPublic } from "@/types";

export default function UsersPage() {
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("guest");
  const [newEmail, setNewEmail] = useState("");
  const [formStatus, setFormStatus] = useState<"idle" | "saving" | "error">("idle");
  const [formMessage, setFormMessage] = useState("");

  function getToken() {
    return localStorage.getItem("fs0ciety_token") || "";
  }

  async function loadUsers() {
    try {
      const data = await api.admin.listUsers(getToken());
      setUsers(data.users);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormStatus("saving");
    try {
      await api.admin.createUser(
        {
          username: newUsername,
          password: newPassword,
          role: newRole,
          email: newEmail || undefined,
        },
        getToken()
      );
      setShowForm(false);
      setNewUsername("");
      setNewPassword("");
      setNewRole("guest");
      setNewEmail("");
      setFormStatus("idle");
      setFormMessage("");
      loadUsers();
    } catch (err: unknown) {
      setFormStatus("error");
      setFormMessage(err instanceof Error ? err.message : "Failed to create user");
    }
  }

  async function handleDelete(username: string) {
    if (!confirm(`Delete user "${username}"?`)) return;
    try {
      await api.admin.deleteUser(username, getToken());
      loadUsers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete user");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-mono font-bold text-terminal-green mb-1">
            Users
          </h1>
          <p className="text-sm font-mono text-terminal-green-dim opacity-60">
            Manage users &mdash; fs0ciety admin
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm font-mono border border-terminal-green text-terminal-green px-4 py-2 hover:bg-terminal-green/10 transition-colors"
        >
          {showForm ? "Cancel" : "+ New User"}
        </button>
      </div>

      {/* Create user form */}
      {showForm && (
        <div className="mb-8 max-w-lg border border-terminal-gray-light bg-terminal-black-light p-6">
          <h2 className="text-lg font-mono font-bold text-terminal-green mb-4">
            Create User
          </h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-xs font-mono text-terminal-green-dim mb-1">
                Username
              </label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                required
                minLength={3}
                className="w-full bg-transparent border border-terminal-green/20 text-terminal-green font-mono px-3 py-2 text-sm outline-none focus:border-terminal-green/60"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-terminal-green-dim mb-1">
                Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={4}
                className="w-full bg-transparent border border-terminal-green/20 text-terminal-green font-mono px-3 py-2 text-sm outline-none focus:border-terminal-green/60"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-terminal-green-dim mb-1">
                Role
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full bg-terminal-black border border-terminal-green/20 text-terminal-green font-mono px-3 py-2 text-sm outline-none focus:border-terminal-green/60"
              >
                <option value="guest">guest</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-terminal-green-dim mb-1">
                Email (optional)
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full bg-transparent border border-terminal-green/20 text-terminal-green font-mono px-3 py-2 text-sm outline-none focus:border-terminal-green/60"
              />
            </div>
            <button
              type="submit"
              disabled={formStatus === "saving"}
              className="w-full border border-terminal-green text-terminal-green font-mono py-2 text-sm hover:bg-terminal-green/10 transition-colors disabled:opacity-50"
            >
              {formStatus === "saving" ? "Creating..." : "Create User"}
            </button>
            {formMessage && (
              <div className="text-xs font-mono text-terminal-red">{formMessage}</div>
            )}
          </form>
        </div>
      )}

      {/* Users table */}
      {loading ? (
        <div className="font-mono text-terminal-green-dim text-sm animate-pulse">
          Loading users...
        </div>
      ) : (
        <div className="border border-terminal-gray-light bg-terminal-black-light">
          <table className="w-full">
            <thead>
              <tr className="border-b border-terminal-gray-light text-left">
                <th className="px-4 py-3 text-xs font-mono text-terminal-green-dim font-normal uppercase tracking-wider">
                  Username
                </th>
                <th className="px-4 py-3 text-xs font-mono text-terminal-green-dim font-normal uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 py-3 text-xs font-mono text-terminal-green-dim font-normal uppercase tracking-wider hidden sm:table-cell">
                  Email
                </th>
                <th className="px-4 py-3 text-xs font-mono text-terminal-green-dim font-normal uppercase tracking-wider hidden md:table-cell">
                  Last Login
                </th>
                <th className="px-4 py-3 text-xs font-mono text-terminal-green-dim font-normal uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.username}
                  className="border-b border-terminal-gray-light last:border-0 hover:bg-terminal-green/5 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-mono text-terminal-green">
                    {user.username}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-mono px-2 py-0.5 border ${
                        user.role === "admin"
                          ? "border-terminal-amber/30 text-terminal-amber"
                          : "border-terminal-green/30 text-terminal-green-dim"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-terminal-green-dim hidden sm:table-cell">
                    {user.email || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-terminal-green-dim hidden md:table-cell">
                    {user.last_login
                      ? new Date(user.last_login).toLocaleString()
                      : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(user.username)}
                      className="text-xs font-mono text-terminal-red-dim hover:text-terminal-red transition-colors"
                    >
                      delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
