import { state } from "./state.js";
import { saveData } from "./storage.js";

const toast = (msg) => window.GEO?.showToast?.(msg);

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

function renderList(type) {
            const containerId = {
                'activity': 'atividades-list',
                'service': 'servicos-list',
                'material': 'materiais-list'
            }[type];
            
            const container = document.getElementById(containerId);
            const list = state.dataStore[type === 'activity' ? 'activities' : type === 'service' ? 'services' : 'materials'];
            const cssClass = `${type}-checkbox`;
            const details = state.dataStore.activityDetails || {};
            
            container.innerHTML = '';
            list.forEach((item, index) => {
                const div = document.createElement('div');
                div.className = "item-row flex flex-col p-2 bg-gray-50 rounded border border-transparent hover:border-gray-200 group";
                
                let innerHTML = `
                    <div class="flex items-center space-x-2">
                        <input type="checkbox" id="${type}-${index}" class="${cssClass} w-5 h-5 cursor-pointer no-screenshot-check" data-name="${escapeHtml(item)}">
                        <label for="${type}-${index}" class="text-sm text-gray-700 cursor-pointer select-none flex-1">${escapeHtml(item)}</label>
                `;

                if (type === 'material') {
                    innerHTML += `<input type="text" id="qty-${type}-${index}" placeholder="Qtd" class="w-16 bg-white text-xs py-1 h-8 mx-1 qty-input" data-action="check-material" data-target="${type}-${index}">`;
                }

                innerHTML += `
                        <button data-action="remove-item" data-type="${type}" data-index="${index}" class="delete-btn no-screenshot text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50" title="Excluir">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                `;

                if (type === 'activity') {
                    const savedDetail = details[item] || '';
                    innerHTML += `
                        <div id="detail-wrap-activity-${index}" class="detail-wrap mt-1 ml-7 hidden">
                            <input type="text" id="detail-activity-${index}" data-activity-name="${escapeHtml(item)}" placeholder="Detalhes/Medição (ex: 3 postes, 120m de cordoalha...)" class="w-full text-xs py-1 px-2 detail-input" value="${escapeHtml(savedDetail)}">
                        </div>
                    `;
                }

                div.innerHTML = innerHTML;
                container.appendChild(div);

                if (type === 'activity') {
                    const cb = div.querySelector(`#${type}-${index}`);
                    const wrap = div.querySelector(`#detail-wrap-activity-${index}`);
                    const detailInput = div.querySelector(`#detail-activity-${index}`);

                    // Mostra/oculta o campo de detalhes ao marcar/desmarcar
                    cb.addEventListener('change', () => {
                        if (cb.checked) {
                            wrap.classList.remove('hidden');
                            detailInput.focus();
                        } else {
                            wrap.classList.add('hidden');
                        }
                    });

                    // Salva o detalhe digitado
                    detailInput.addEventListener('input', () => {
                        if (!state.dataStore.activityDetails) state.dataStore.activityDetails = {};
                        state.dataStore.activityDetails[item] = detailInput.value;
                        saveData();
                    });

                    // Permite que o campo de detalhe seja o campo "ativo" para preenchimento por voz
                    detailInput.addEventListener('focus', () => {
                        if (state.activeField) state.activeField.classList.remove('voice-target');
                        state.activeField = detailInput;
                        detailInput.classList.add('voice-target');
                        showToast(`🎯 Detalhes: ${item.length > 30 ? item.slice(0,30)+'…' : item}`);
                    });
                }
            });
        }

        function addItem(type) {
            const input = document.getElementById(`new-${type}`);
            const val = input.value.trim();
            if (val) {
                const key = type === 'activity' ? 'activities' : type === 'service' ? 'services' : 'materials';
                if (!state.dataStore[key].includes(val)) {
                    state.dataStore[key].push(val);
                    saveData();
                    input.value = '';
                    renderList(type);
                    showToast("Adicionado!");
                }
            }
        }

        function removeItem(type, index) {
            const key = type === 'activity' ? 'activities' : type === 'service' ? 'services' : 'materials';
            state.dataStore[key].splice(index, 1);
            saveData();
            renderList(type);
        }

        // ========== MAIS USADOS - SELEÇÃO RÁPIDA ==========
        const MAIS_USADOS = [
            "22025072- FITA ISOLANTE 3M 33+",
            "22056332- FITA AUTO-FUSAO 23LB 19X10MM 3M NET",
            "22056335- FECHO DE ACO INOX DENTADO 3/4",
            "22055824- FITA INOX 3/4 X 0,5MM X 25M",
            "30034556- TAP 02S 04DB 1GHZ FFT2-4-TP-R",
            "30034557- TAP 02S 20DB 1GHZ FFT2-20P-R",
            "30034575- TAP 02S 10DB 1GHZ FFT2-10P-R",
            "30034553- TAP 04S 20DB 1GHZ FFT4-20P-R",
            "30034505- DIV_RE 3S 1GHZ SSP-3-636N-R",
            "30034508- DC_RE 07DB 1GHZ SSP-7N-R",
            "30034509- DC_RE 12DB 1GHZ SSP-12N-R",
            "60000132- CABO COAXIAL RE P3 .750 S/M PT",
            "60000133- CABO COAXIAL RE P3 .500 S/M PT",
            "22025704- CONECTOR ATERRAMENTO 16MM",
            "22025669- HASTE ATER SAE1020 16MM 2,4M",
            "30033093- CONEC_RE ADAPT.EQPT/EQPT",
            "30033096- CONEC_RE .750 3 PC PINO LONGO",
            "30033099- CONEC_RE .500 PINO LONGO",
            "30034275- PARAFUSO P/ABRAC BAP 2 E 3",
            "ACRE0367- PROTETOR TERMOCONTR.500 A .625"
        ];

        function openMaisUsados() {
            document.getElementById('mais-usados-modal').classList.remove('hidden');
            document.getElementById('mais-usados-busca').value = '';
            renderMaisUsadosChips();
            filtrarModalMateriais();
        }

        function closeMaisUsados() {
            document.getElementById('mais-usados-modal').classList.add('hidden');
        }

        function renderMaisUsadosChips() {
            const container = document.getElementById('mais-usados-chips');
            container.innerHTML = '';
            MAIS_USADOS.forEach(mat => {
                const btn = document.createElement('button');
                // Nome curto: pega parte após "- " ou trunca
                const label = mat.replace(/^\S+- /, '').substring(0, 22) + (mat.replace(/^\S+- /, '').length > 22 ? '…' : '');
                const alreadyIn = state.dataStore.materials.includes(mat);
                btn.className = `text-xs px-2 py-1 rounded-full border font-medium transition ${alreadyIn ? 'bg-red-100 text-red-700 border-red-300' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-red-50 hover:border-red-300 hover:text-red-700'}`;
                btn.textContent = (alreadyIn ? '✓ ' : '+ ') + label;
                btn.title = mat;
                btn.dataset.action = 'quick-material'; btn.dataset.mat = mat;
                container.appendChild(btn);
            });
        }

        function filtrarModalMateriais() {
            const termo = (document.getElementById('mais-usados-busca').value || '').toLowerCase();
            const lista = document.getElementById('mais-usados-lista');
            lista.innerHTML = '';
            state.dataStore.materials.filter(m => !termo || m.toLowerCase().includes(termo)).forEach(mat => {
                const div = document.createElement('div');
                div.className = 'flex items-center gap-2 py-1 border-b border-gray-100 last:border-0';
                const span = document.createElement('span');
                span.className = 'text-xs text-gray-700 flex-1';
                span.textContent = mat;
                const btn = document.createElement('button');
                btn.className = 'text-xs px-2 py-1 rounded border font-bold transition bg-red-50 text-red-700 border-red-200 hover:bg-red-100';
                btn.textContent = 'Selecionar';
                btn.dataset.mat = mat;
                btn.addEventListener('click', function() { marcarMaterialModal(this.dataset.mat, this); });
                div.appendChild(span);
                div.appendChild(btn);
                lista.appendChild(div);
            });
            if (termo) {
                MAIS_USADOS.filter(m => !state.dataStore.materials.includes(m) && m.toLowerCase().includes(termo)).forEach(mat => {
                    const div = document.createElement('div');
                    div.className = 'flex items-center gap-2 py-1 border-b border-gray-100 last:border-0';
                    const span = document.createElement('span');
                    span.className = 'text-xs text-gray-400 flex-1 italic';
                    span.textContent = mat + ' (add)';
                    const btn = document.createElement('button');
                    btn.className = 'text-xs px-2 py-1 rounded border font-bold transition bg-green-50 text-green-700 border-green-200 hover:bg-green-100';
                    btn.textContent = '+ Add';
                    btn.dataset.mat = mat;
                    btn.addEventListener('click', function() {
                        addMaterialFromModal(this.dataset.mat);
                        filtrarModalMateriais();
                        renderMaisUsadosChips();
                    });
                    div.appendChild(span);
                    div.appendChild(btn);
                    lista.appendChild(div);
                });
            }
        }

        function addMaterialFromModal(mat) {
            if (!state.dataStore.materials.includes(mat)) {
                state.dataStore.materials.push(mat);
                saveData();
                renderList('material');
                showToast('Material adicionado!');
            }
        }

        function marcarMaterialModal(mat, btn) {
            // Marca o checkbox do material na lista principal
            const checkboxes = document.querySelectorAll('.material-checkbox');
            let found = false;
            checkboxes.forEach(cb => {
                if (cb.dataset.name === mat) {
                    cb.checked = true;
                    found = true;
                    const qtyEl = document.getElementById(`qty-material-${cb.id.replace('material-', '')}`);
                    if (qtyEl && !qtyEl.value) qtyEl.value = '1';
                }
            });
            if (found) {
                btn.textContent = '✓';
                btn.classList.replace('bg-red-50', 'bg-green-100');
                btn.classList.replace('text-red-700', 'text-green-700');
                showToast('Marcado: ' + mat.replace(/^\S+- /, '').substring(0, 30));
            } else {
                showToast('Material não encontrado na lista principal');
            }
        }

        // ========== FIM MAIS USADOS ==========


        

export { renderList, addItem, removeItem, openMaisUsados, closeMaisUsados, filtrarModalMateriais };


document.addEventListener("geo:quick-material", (event) => {
    const mat = event.detail?.mat;
    if (!mat) return;
    addMaterialFromModal(mat);
    renderMaisUsadosChips();
    filtrarModalMateriais();
});
