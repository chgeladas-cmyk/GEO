const toast = (msg) => window.GEO?.showToast?.(msg);

export function copyToClipboard() {
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

            const temp = document.createElement('textarea');
            temp.value = text;
            document.body.appendChild(temp);
            temp.select();
            document.execCommand('copy');
            document.body.removeChild(temp);
            toast("Copiado para o WhatsApp!");
        }

        