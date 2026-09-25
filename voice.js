import { state } from "./state.js";

const toast = (...args) => window.GEO?.showToast?.(...args);

function normalize(str) {
            return str.toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9 ]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        }

        // Converte número falado por extenso (0-9) em dígito, para capturar códigos como "dois ponto treze"
        const numWords = {
            'zero':'0','um':'1','uma':'1','dois':'2','duas':'2','tres':'3','três':'3',
            'quatro':'4','cinco':'5','seis':'6','sete':'7','oito':'8','nove':'9','dez':'10'
        };

        function spokenToCode(text) {
            let t = normalize(text);
            // separa "ponto"/"virgula" como separador decimal
            t = t.replace(/\b(ponto|virgula)\b/g, '.');
            // troca números por extenso por dígitos
            t = t.split(' ').map(w => numWords[w] !== undefined ? numWords[w] : w).join(' ');
            // remove espaços ao redor do ponto: "2 . 13" -> "2.13"
            t = t.replace(/\s*\.\s*/g, '.');
            return t.trim();
        }

        function tryCheckActivityByCode(transcript) {
            const code = spokenToCode(transcript);
            // procura algo como "2.13" no início do texto
            const match = code.match(/(\d{1,2}\.\d{1,2})/);
            if (!match) return false;
            const codeStr = match[1];
            const idx = state.dataStore.activities.findIndex(item => item.startsWith(codeStr));
            if (idx >= 0) {
                const cb = document.getElementById(`activity-${idx}`);
                if (cb) {
                    cb.checked = !cb.checked;
                    toast((cb.checked ? '✅ ' : '⬜ ') + state.dataStore.activities[idx]);
                    return true;
                }
            }
            return false;
        }

        function tryCheckActivityByName(transcript) {
            const norm = normalize(transcript);
            let best = -1, bestScore = 0;
            state.dataStore.activities.forEach((item, idx) => {
                const itemNorm = normalize(item.replace(/^\d+\.\d+\s*-\s*/, ''));
                const words = itemNorm.split(' ').filter(w => w.length > 2);
                let score = 0;
                words.forEach(w => { if (norm.includes(w)) score++; });
                if (score > bestScore) { bestScore = score; best = idx; }
            });
            if (best >= 0 && bestScore >= 2) {
                const cb = document.getElementById(`activity-${best}`);
                if (cb) {
                    cb.checked = !cb.checked;
                    toast((cb.checked ? '✅ ' : '⬜ ') + state.dataStore.activities[best]);
                    return true;
                }
            }
            return false;
        }

        // ===== Preenchimento por toque + voz =====
        // Quando o usuário toca em um campo de texto, ele se torna o "campo ativo".
        // O próximo comando de voz (se não for código/nome de atividade) preenche esse campo.
        

        const fieldLabels = {
            'field-id': 'Número do RDO',
            'field-equipe': 'Equipe',
            'field-tecnicos': 'Técnicos',
            'field-task': 'Task TOA',
            'field-incident': 'Incident ID',
            'field-endereco': 'Endereço',
            'field-bairro': 'Bairro',
            'field-cidade-uf': 'Cidade/UF',
            'new-activity': 'Nova Atividade',
            'field-obs-materiais': 'Obs. Materiais',
            'new-material': 'Novo Material'
        };

        function setupActiveFieldTracking() {
            Object.keys(fieldLabels).forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;
                el.addEventListener('focus', () => {
                    if (state.activeField) state.activeField.classList.remove('voice-target');
                    state.activeField = el;
                    el.classList.add('voice-target');
                    toast(`🎯 Campo selecionado: ${fieldLabels[id]}`);
                });
            });
        }

        // Preenchimento direto do campo ativo é feito em processVoiceCommand

        function tryFillField(transcript) {
            const norm = normalize(transcript);
            const fieldMap = [
                { keys: ['bairro'], id: 'field-bairro' },
                { keys: ['cidade'], id: 'field-cidade-uf' },
                { keys: ['tecnico', 'tecnicos', 'técnico', 'técnicos'], id: 'field-tecnicos' },
                { keys: ['endereco', 'endereço'], id: 'field-endereco' },
                { keys: ['task'], id: 'field-task' },
                { keys: ['incident'], id: 'field-incident' },
                { keys: ['observacao de material', 'observacao material', 'obs material'], id: 'field-obs-materiais' }
            ];
            for (const f of fieldMap) {
                for (const key of f.keys) {
                    const idx = norm.indexOf(normalize(key));
                    if (idx !== -1) {
                        const value = transcript.slice(idx + key.length).replace(/^[:\s-]+/, '').trim();
                        if (value) {
                            const el = document.getElementById(f.id);
                            if (el) {
                                el.value = value;
                                el.dispatchEvent(new Event('input'));
                                toast(`📝 ${fieldLabels[f.id]}: ${value}`);
                                return true;
                            }
                        }
                    }
                }
            }
            return false;
        }

        function processVoiceCommand(transcript) {
            // Se há um campo tocado/ativo, preenche ele diretamente com o texto falado (sempre prioridade)
            if (state.activeField) {
                let value;
                if (state.activeField.id === 'field-id') {
                    const code = spokenToCode(transcript);
                    const digits = code.replace(/[^0-9]/g, '');
                    if (!digits) {
                        toast('❓ Diga um número para este campo.');
                        return;
                    }
                    value = digits.slice(0, 6);
                } else if (state.activeField.type === 'number') {
                    const code = spokenToCode(transcript);
                    const match = code.match(/\d+/);
                    if (!match) {
                        toast('❓ Diga um número para este campo.');
                        return;
                    }
                    value = match[0];
                } else {
                    value = transcript.trim().toUpperCase();
                }
                if (state.activeField.value && state.activeField.tagName === 'TEXTAREA') {
                    state.activeField.value = state.activeField.value + ' ' + value;
                } else {
                    state.activeField.value = value;
                }
                state.activeField.dispatchEvent(new Event('input'));
                toast(`📝 ${fieldLabels[state.activeField.id] || state.activeField.id}: ${state.activeField.value}`);
                return;
            }
            // Sem campo ativo: tenta código/nome de atividade
            if (tryCheckActivityByCode(transcript)) return;
            if (tryFillField(transcript)) return;
            if (tryCheckActivityByName(transcript)) return;
            toast('❓ Não entendi: "' + transcript + '"');
        }

        function setupRecognition() {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                toast('Reconhecimento de voz não suportado neste navegador.');
                return null;
            }
            const rec = new SpeechRecognition();
            rec.lang = 'pt-BR';
            rec.continuous = true;
            rec.interimResults = false;

            rec.onresult = (event) => {
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        const transcript = event.results[i][0].transcript.trim();
                        processVoiceCommand(transcript);
                    }
                }
            };

            rec.onerror = (e) => {
                toast('Erro no microfone: ' + e.error);
            };

            rec.onend = () => {
                if (state.voiceActive) {
                    try { rec.start(); } catch (e) {}
                }
            };

            return rec;
        }

        function toggleVoice() {
            const btn = document.getElementById('voice-btn');
            if (!state.voiceActive) {
                if (!state.recognition) state.recognition = setupRecognition();
                if (!state.recognition) return;
                try {
                    state.recognition.start();
                    state.voiceActive = true;
                    btn.classList.add('bg-red-100', 'text-red-700', 'border-red-300');
                    btn.classList.remove('bg-green-50', 'text-green-700', 'border-green-200');
                    btn.innerHTML = '🔴 Ouvindo...';
                    toast('🎤 Comando de voz ativado');
                } catch (e) {
                    toast('Erro ao iniciar microfone');
                }
            } else {
                state.voiceActive = false;
                state.recognition.stop();
                btn.classList.remove('bg-red-100', 'text-red-700', 'border-red-300');
                btn.classList.add('bg-green-50', 'text-green-700', 'border-green-200');
                btn.innerHTML = '🎤 Voz';
                toast('🎤 Comando de voz desativado');
            }
        }


export { setupActiveFieldTracking, toggleVoice, processVoiceCommand };
