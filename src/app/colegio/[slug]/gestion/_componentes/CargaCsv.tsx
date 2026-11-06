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
        className="min-h-11 rounded-[10px] border border-dashed border-input bg-superficie-2/50 p-1.5 text-sm file:mr-3 file:h-8 file:cursor-pointer file:rounded-md file:border file:border-input file:bg-card file:px-3 file:text-sm file:font-semibold"
      />
    </label>
  );
}
