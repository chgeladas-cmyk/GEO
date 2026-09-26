import { validarAntesDeExportar } from "./validation.js";

const toast = (msg) => window.GEO?.showToast?.(msg);

export async function takeScreenshot() {
            if (!validarAntesDeExportar()) return;
            const element = document.getElementById('capture-area');
            const btnsToHide = document.querySelectorAll('.no-screenshot');
            
            btnsToHide.forEach(el => el.style.display = 'none');
            const rows = document.querySelectorAll('.item-row');
            rows.forEach(row => {
                const cb = row.querySelector('input[type="checkbox"]');
                if (cb && !cb.checked) row.style.display = 'none';
                else if (cb) cb.style.display = 'none';
            });

            element.classList.add('printing-mode');

            try {
                const canvas = await html2canvas(element, { 
                    backgroundColor: "#f9fafb", 
                    scale: 3,
                    useCORS: true
                });

                const img = new Image();
                img.src = canvas.toDataURL('image/png');
                img.className = "max-w-full h-auto rounded shadow-lg border-2 border-gray-100";
                
                document.getElementById('screenshot-container').innerHTML = '';
                document.getElementById('screenshot-container').appendChild(img);
                document.getElementById('screenshot-modal').classList.remove('hidden');
            } catch (err) {
                toast("Erro ao gerar imagem.");
            } finally {
                btnsToHide.forEach(el => el.style.display = '');
                rows.forEach(row => row.style.display = '');
                document.querySelectorAll('.no-screenshot-check').forEach(cb => cb.style.display = '');
                element.classList.remove('printing-mode');
            }
        }

        export function closeScreenshot() {
            document.getElementById('screenshot-modal').classList.add('hidden');
        }


