# GEO — Fase 5

Reestruturação modular com suporte inicial a PWA/offline.

## O que esta fase adiciona
- Service Worker com cache versionado.
- App shell local disponível offline após a primeira abertura bem-sucedida.
- Estratégia network-first para navegação.
- Estratégia cache-first para recursos locais.
- Cache de recursos externos quando já tiverem sido carregados com sucesso.
- Manifesto PWA básico.
- Registro do Service Worker sem bloquear a aplicação.

## Observação
Os recursos de terceiros continuam sendo carregados pelos CDNs originais. Portanto, o primeiro carregamento precisa de internet para que essas bibliotecas sejam obtidas; depois de carregadas, o Service Worker pode reutilizar as cópias em cache quando disponíveis.

## Próxima fase
A próxima etapa deve avaliar IndexedDB para dados maiores e uma estratégia explícita de sincronização, sem substituir o localStorage até que os testes de migração estejam concluídos.
