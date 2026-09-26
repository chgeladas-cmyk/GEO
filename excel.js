import { state } from "./state.js";
const toast = (msg) => window.GEO?.showToast?.(msg);

export async function exportAndShareExcel() {
            const getValue = (id) => document.getElementById(id).value || '---';
            const baseInfo = [
                ["CARIMBO DIGITAL"],
                ["NÚMERO DO RDO", getValue('field-id')],
                ["DATA", getValue('current-date')],
                ["EQUIPE", getValue('field-equipe')],
                ["TÉCNICOS", getValue('field-tecnicos')],
                [""],
                ["LOCALIZAÇÃO"],
                ["TASK TOA", getValue('field-task')],
                ["INCIDENT ID", getValue('field-incident')],
                ["ENDEREÇO", getValue('field-endereco')],
                ["BAIRRO", getValue('field-bairro')],
                ["CIDADE/ESTADO", getValue('field-cidade-uf')],
                [""],
                ["ATIVIDADES SELECIONADAS"]
            ];

            Array.from(document.querySelectorAll('.activity-checkbox:checked')).forEach(cb => {
                const name = cb.getAttribute('data-name');
                const detail = (state.dataStore.activityDetails && state.dataStore.activityDetails[name]) || '';
                baseInfo.push(["-", name, detail]);
            });
            
            baseInfo.push([""], ["MATERIAL GASTO", "QUANTIDADE"]);
            Array.from(document.querySelectorAll('.material-checkbox:checked')).forEach(cb => {
                const index = cb.id.split('-')[1];
                const qty = document.getElementById(`qty-material-${index}`).value || '1';
                baseInfo.push([cb.getAttribute('data-name'), qty]);
            });

            const ws = XLSX.utils.aoa_to_sheet(baseInfo);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "CARIMBO");
            
            const fileName = `Carimbo_RDO_${getValue('field-id')}_${getValue('current-date')}.xlsx`;
            XLSX.writeFile(wb, fileName);
            toast("Excel descarregado!");
        }

        