import { state } from "./state.js";
import { validarAntesDeExportar } from "./validation.js";

const toast = (msg) => window.GEO?.showToast?.(msg);

function buildText() {
            const getValue = (id) => document.getElementById(id).value || '---';
            const selectedActs = Array.from(document.querySelectorAll('.activity-checkbox:checked')).map(cb => {
                const name = cb.getAttribute('data-name');
                const detail = (state.dataStore.activityDetails && state.dataStore.activityDetails[name]) || '';
                return "✅ " + name + (detail ? ` — ${detail}` : '');
            });
            const selectedMats = Array.from(document.querySelectorAll('.material-checkbox:checked')).map(cb => {
                const index = cb.id.split('-')[1];
                const qty = document.getElementById(`qty-material-${index}`).value || '1';
                return `📦 ${qty}x ${cb.getAttribute('data-name')}`;
            });

            let text = `📋 *CARIMBO DIGITAL*\n`;
            text += `*RDO:* ${getValue('field-id')} | *DATA:* ${getValue('current-date')}\n`;
            text += `*EQUIPE:* ${getValue('field-equipe')}\n*TÉCNICOS:* ${getValue('field-tecnicos')}\n\n`;
            text += `📍 *LOCALIZAÇÃO*\n*End:* ${getValue('field-endereco')}\n*Bairro:* ${getValue('field-bairro')}\n*Cidade:* ${getValue('field-cidade-uf')}\n\n`;

            if(selectedActs.length > 0) text += `🛠 *ATIVIDADES:*\n${selectedActs.join('\n')}\n\n`;

            text += `*TASK:* ${getValue('field-task')}\n`;
            text += `*INCIDENT:* ${getValue('field-incident')}\n\n`;

            if(selectedMats.length > 0) text += `📦 *MATERIAIS:*\n${selectedMats.join('\n')}`;

            return text;
}

function copyWithExecCommand(text) {
            const temp = document.createElement('textarea');
            temp.value = text;
            temp.setAttribute('readonly', '');
            temp.style.position = 'fixed';
            temp.style.top = '0';
            temp.style.left = '0';
            temp.style.opacity = '0';
            document.body.appendChild(temp);
            temp.focus();
            temp.select();
            temp.setSelectionRange(0, text.length); // necessário no Safari/iOS
            let ok = false;
            try {
                ok = document.execCommand('copy');
            } catch {
                ok = false;
            }
            document.body.removeChild(temp);
            return ok;
}

export async function copyToClipboard() {
            if (!validarAntesDeExportar()) return;
            const text = buildText();

            if (navigator.clipboard?.writeText && window.isSecureContext) {
                try {
                    await navigator.clipboard.writeText(text);
                    toast("Copiado para o WhatsApp!");
                    return;
                } catch {
                    // Se a API moderna falhar (ex: sem permissão), tenta o método alternativo abaixo.
                }
            }

            if (copyWithExecCommand(text)) {
                toast("Copiado para o WhatsApp!");
            } else {
                toast("Não foi possível copiar automaticamente. Copie manualmente.");
            }
}

        