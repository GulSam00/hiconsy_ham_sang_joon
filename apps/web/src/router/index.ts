import { ACTOR_ROLE, type ActorRole } from '@study-room/shared';
import type { Pinia } from 'pinia';
import { createRouter, createWebHistory, type Router } from 'vue-router';
import { useActorStore } from '@/stores/actor';
import { ROUTE_NAME, parseRouteId, redirectFor } from './route-access';

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
        path: '/teacher/rooms/:id',
        name: ROUTE_NAME.TEACHER_ROOM_DETAIL,
        component: () => import('@/pages/teacher/TeacherRoomDetailPage.vue'),
        meta: { role: ACTOR_ROLE.TEACHER, title: '자습실 상세' },
        // 숫자가 아닌 id로 API를 부르지 않고 바로 404 화면으로 보낸다.
        beforeEnter: (to) =>
          parseRouteId(to.params.id) === null
            ? { name: ROUTE_NAME.NOT_FOUND, params: { pathMatch: to.path.slice(1).split('/') } }
            : true,
        props: (route) => ({ id: parseRouteId(route.params.id) }),
      },
      {
        path: '/teacher/students',
        name: ROUTE_NAME.TEACHER_STUDENTS,
        component: () => import('@/pages/teacher/TeacherStudentsPage.vue'),
        meta: { role: ACTOR_ROLE.TEACHER, title: '학생 관리' },
      },
      {
        path: '/student/rooms',
        name: ROUTE_NAME.STUDENT_ROOMS,
        component: () => import('@/pages/student/StudentRoomsPage.vue'),
        meta: { role: ACTOR_ROLE.STUDENT, title: '자습실 신청' },
      },
      {
        path: '/student/visits',
        name: ROUTE_NAME.STUDENT_VISITS,
        component: () => import('@/pages/student/StudentVisitsPage.vue'),
        meta: { role: ACTOR_ROLE.STUDENT, title: '내 신청' },
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
