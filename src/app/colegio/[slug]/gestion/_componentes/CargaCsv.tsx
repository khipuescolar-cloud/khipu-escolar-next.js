/** Selector de archivo CSV con el estilo de los campos (specs/18). */
export function CampoArchivoCsv() {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">Archivo CSV</span>
      <input
        type="file"
        name="archivo"
        accept=".csv,text/csv"
        required
        className="min-h-10 text-sm file:mr-3 file:h-10 file:cursor-pointer file:rounded-md file:border file:border-input file:bg-card file:px-3 file:text-sm file:font-semibold"
      />
    </label>
  );
}
