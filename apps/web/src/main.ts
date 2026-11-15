import { ACTOR_ROLE, ERROR_CODE } from '@study-room/shared';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import type { ApiError } from '@/api/api-error';
import { createApiClient, installApiClient } from '@/api/client';
import { createQueryClient } from '@/queries/query-client';
import { createAppRouter } from '@/router';
import { ROUTE_NAME } from '@/router/route-access';
import { useActorStore } from '@/stores/actor';
import App from './App.vue';
import './style.css';

const pinia = createPinia();
const actorStore = useActorStore(pinia);
const router = createAppRouter(pinia);

installApiClient(createApiClient(() => actorStore.actor));

/**
 * 저장된 요청자가 더 이상 유효하지 않으면 역할 선택으로 돌려보낸다.
 * - 401: 헤더가 깨졌다 (저장소 조작 등)
 * - 학생 요청자의 STUDENT_NOT_FOUND: 강사가 그 학생을 삭제했다
 * 강사가 삭제된 학생을 다룰 때의 STUDENT_NOT_FOUND는 화면에서 처리하므로 여기서 건드리지 않는다.
 */
function handleApiError(error: ApiError): void {
  const isInvalidActor =
    error.code === ERROR_CODE.ACTOR_REQUIRED ||
    (error.code === ERROR_CODE.STUDENT_NOT_FOUND && actorStore.actor?.role === ACTOR_ROLE.STUDENT);
  if (isInvalidActor) {
    actorStore.clear();
    void router.push({ name: ROUTE_NAME.ROLE_SELECT });
  }
}

createApp(App)
  .use(pinia)
  .use(router)
  .use(VueQueryPlugin, { queryClient: createQueryClient(handleApiError) })
  .mount('#app');
