export async function getGeolocalizacao() {
  const toast = window.GEO?.showToast || (() => {});
  if (!navigator.geolocation) { toast("GPS não suportado pelo navegador."); return; }
  toast("Buscando localização...");
  navigator.geolocation.getCurrentPosition(async position => {
    const { latitude: lat, longitude: lon } = position.coords;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.address) {
        const addr = data.address;
        const rua = addr.road || addr.pedestrian || "";
        const num = addr.house_number || "S/N";
        const bairro = addr.suburb || addr.neighbourhood || addr.city_district || "";
        const cidade = addr.city || addr.town || addr.village || "";
        const estado = addr.state || "";
        document.getElementById("field-endereco").value = `${rua}, ${num}`;
        document.getElementById("field-bairro").value = bairro;
        document.getElementById("field-cidade-uf").value = `${cidade} - ${estado}`;
        toast("Localização preenchida!");
      }
    } catch { toast("Erro ao identificar endereço."); }
  }, () => toast("Permissão de GPS negada."), { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
}
