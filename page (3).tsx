import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import UploadForm from "./upload-form";

export default async function BiometricUploadPage() {
  await requireProfile(["hr_admin", "hr_officer"]);
  const supabase = createClient();
  const { data: recentUploads } = await supabase
    .from("biometric_uploads")
    .select("*")
    .order("uploaded_at", { ascending: false })
    .limit(10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Biometric Attendance Upload</h1>
        <p className="text-sm text-slate-500">
          Upload the export from the existing biometric device/system. Attendance,
          headcount, matching, duplicates and exceptions are computed automatically —
          nothing here is re-typed.
        </p>
      </div>

      <div className="card">
        <UploadForm />
      </div>

      <div className="card overflow-x-auto">
        <h2 className="font-medium mb-2">Recent uploads</h2>
        <table className="table-base">
          <thead>
            <tr>
              <th>File</th>
              <th>Uploaded</th>
              <th>Total</th>
              <th>Matched</th>
              <th>Unmatched</th>
              <th>Duplicates</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(recentUploads ?? []).map((u) => (
              <tr key={u.id}>
                <td>{u.file_name}</td>
                <td>{new Date(u.uploaded_at).toLocaleString()}</td>
                <td>{u.total_rows}</td>
                <td>{u.matched_rows}</td>
                <td className={u.unmatched_rows > 0 ? "text-amber-600 font-medium" : ""}>
                  {u.unmatched_rows}
                </td>
                <td className={u.duplicate_rows > 0 ? "text-amber-600 font-medium" : ""}>
                  {u.duplicate_rows}
                </td>
                <td>{u.status}</td>
              </tr>
            ))}
            {(!recentUploads || recentUploads.length === 0) && (
              <tr>
                <td colSpan={7} className="text-center text-slate-400 py-6">
                  No uploads yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
