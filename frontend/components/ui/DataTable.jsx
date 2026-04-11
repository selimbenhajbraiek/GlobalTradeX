export function DataTable({ columns, rows, empty }) {
  if (!rows?.length) {
    return empty || null;
  }
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-panel/50">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-rail/90 text-xs uppercase tracking-wide text-mist">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 font-medium">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line/80 text-mist">
            {rows.map((row, idx) => (
              <tr key={row.id ?? idx} className="hover:bg-rail/40">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-[var(--text)]/90">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
