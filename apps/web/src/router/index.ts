import { ACTOR_ROLE, type ActorRole } from '@study-room/shared';
import type { Pinia } from 'pinia';
import { createRouter, createWebHistory, type Router } from 'vue-router';
import { useActorStore } from '@/stores/actor';
import { ROUTE_NAME, redirectFor } from './route-access';

declare module 'vue-router' {
  interface RouteMeta {
    /** 이 화면을 쓸 수 있는 역할. 없으면 누구나 */
    role?: ActorRole;
    title?: string;
  }
}

const APP_TITLE = '자습실 예약';

export function createAppRouter(pinia: Pinia): Router {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      {
        path: '/',
        name: ROUTE_NAME.ROLE_SELECT,
        component: () => import('@/pages/RoleSelectPage.vue'),
        meta: { title: '역할 선택' },
      },
      {
        path: '/teacher/rooms',
        name: ROUTE_NAME.TEACHER_ROOMS,
        component: () => import('@/pages/teacher/TeacherRoomsPage.vue'),
        meta: { role: ACTOR_ROLE.TEACHER, title: '자습실 관리' },
      },
      {
        path: '/student/rooms',
        name: ROUTE_NAME.STUDENT_ROOMS,
        component: () => import('@/pages/student/StudentRoomsPage.vue'),
        meta: { role: ACTOR_ROLE.STUDENT, title: '자습실 신청' },
      },
      {
        path: '/:pathMatch(.*)*',
        name: ROUTE_NAME.NOT_FOUND,
        component: () => import('@/pages/NotFoundPage.vue'),
        meta: { title: '페이지 없음' },
      },
    ],
  });

  router.beforeEach((to) => {
    const redirect = redirectFor(to.meta.role, useActorStore(pinia).actor);
    return redirect === null ? true : { name: redirect };
  });

  router.afterEach((to) => {
    document.title = to.meta.title === undefined ? APP_TITLE : `${to.meta.title} · ${APP_TITLE}`;
  });

  return router;
}
