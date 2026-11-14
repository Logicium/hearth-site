/**
 * The public route table, with each page's SEO record.
 *
 * This is the only list of public routes. The router spreads it; the
 * prerender (scripts/prerender.ts) walks it to write one HTML file per page,
 * the sitemap, robots.txt and llms.txt; the runtime applies the same records on
 * navigation. Admin routes live in the router and are never indexed. Every
 * field reads the reactive site config when it is called, so a provisioned
 * build and a hydrated page both describe the owner's inn. No browser
 * dependency here: the prerender imports this under Node.
 */
import type { RouteRecordRaw } from 'vue-router'
import { esc } from '@apotome/archetype-shared/seo/index'
import * as b from '@apotome/archetype-shared/seo/bodies'
import { roomNodes } from '@apotome/archetype-shared/seo/nodes'
import { requireVariant } from '@apotome/archetype-shared/platform/variantGuard'
import { variantAtLeast } from '@apotome/archetype-shared/themes/tokens'
import { siteConfig as c, type Room } from './config/site.config'

const town = () => c.contact.address.split(',')[1]?.trim() ?? ''
const place = () => (town() ? `${c.brand} in ${town()}` : c.brand)
const portfolio = () => variantAtLeast(c.variant, 'portfolio')

function roomsBody(list: Room[], title?: string, rateFrom = 'From'): string {
  const rooms = list.filter((r) => r.name)
  if (!rooms.length) return ''
  return `<section>${b.h(2, title)}${rooms
    .map((r) => `<article>${b.h(3, r.name)}${b.p(r.blurb)}${b.ul(r.features ?? [])}${r.rateFrom ? `<p>${esc(rateFrom)} ${esc(r.rateFrom)} a night</p>` : ''}</article>`)
    .join('')}</section>`
}

function amenitiesBody(list: Array<{ label: string; description?: string }>, title?: string): string {
  const items = list.filter((a) => a.label)
  if (!items.length) return ''
  return `<section>${b.h(2, title)}<ul>${items.map((a) => `<li><strong>${esc(a.label)}</strong>${a.description ? `: ${esc(a.description)}` : ''}</li>`).join('')}</ul></section>`
}

export const publicRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('./views/HomeView.vue'),
    meta: {
      seo: {
        description: () => b.compose([c.blurb, `See the rooms, rates and amenities, and book your stay${town() ? ` in ${town()}` : ''}`, c.tagline]),
        schema: ({ site }) => roomNodes(site, '/rooms', c.rooms),
        body: () =>
          b.main(
            b.hero(c.brand, c.tagline, c.blurb),
            b.story(c.story, c.sections.story.eyebrow),
            roomsBody(c.rooms.slice(0, portfolio() ? 4 : 3), c.sections.rooms.title, c.sections.rooms.rateFromLabel),
            amenitiesBody(c.amenities, c.sections.amenities.title),
            b.testimonials(c.testimonials, c.sections.reviews.title),
            b.contact(c.contact, c.sections.contact.title),
          ),
      },
    },
  },
  {
    path: '/rooms',
    name: 'rooms',
    component: () => import('./views/RoomsView.vue'),
    meta: {
      seo: {
        title: () => c.sections.roomsPage.title,
        description: () => {
          const rooms = b.listOf(c.rooms.map((r) => (r.rateFrom ? `${r.name} from ${r.rateFrom}` : r.name)), 3)
          return b.compose([`Rooms at ${place()}${rooms ? `: ${rooms} a night` : ''}`, c.sections.roomsPage.subtitle])
        },
        schema: ({ site, path }) => roomNodes(site, path, c.rooms),
        body: () =>
          b.main(
            b.hero(c.sections.roomsPage.title, c.sections.roomsPage.eyebrow, c.sections.roomsPage.subtitle),
            roomsBody(c.rooms, c.sections.rooms.title, c.sections.rooms.rateFromLabel),
            amenitiesBody(c.amenities, c.sections.roomsPage.amenitiesTitle),
          ),
      },
    },
  },
  {
    path: '/book',
    name: 'book',
    component: () => import('./views/BookView.vue'),
    meta: {
      seo: {
        title: () => c.sections.bookPage.title,
        description: () => b.compose([`Book a room at ${place()}: pick your dates and room, or send a note and we will reply`, c.sections.bookPage.subtitle]),
        body: () =>
          b.main(
            b.hero(c.sections.bookPage.title, c.sections.bookPage.eyebrow, c.sections.bookPage.subtitle),
            /^https?:\/\//.test(c.bookingUrl) ? `<p><a href="${esc(c.bookingUrl)}">${esc(c.sections.bookPage.externalCtaLabel)}</a></p>` : '',
            b.contact(c.contact, c.sections.contact.title),
          ),
      },
    },
  },
  {
    // Always registered; the guard keeps it paid-only. Omitting the route
    // here would strand upgraded sites, whose variant only arrives after
    // this module has already been evaluated. Out of the index until then.
    path: '/gallery',
    name: 'gallery',
    component: () => import('./views/GalleryView.vue'),
    beforeEnter: requireVariant('portfolio', () => c.variant),
    meta: {
      seo: {
        title: () => c.sections.galleryPage.title,
        description: () => {
          const shots = b.listOf(c.photos.gallery.map((ph) => ph.alt?.toLowerCase()), 5)
          return b.compose([`Photos of ${place()}${shots ? `: ${shots}` : ''}`, c.tagline, c.blurb])
        },
        image: () => c.photos.about.src || undefined,
        noindex: () => !portfolio(),
        body: () => b.main(b.hero(c.sections.galleryPage.title, c.sections.galleryPage.eyebrow), b.photos(c.photos.gallery)),
      },
    },
  },
]

/** The catch-all: a real not-found page, noindex, never a redirect home. */
export const notFoundRoute: RouteRecordRaw = {
  path: '/:pathMatch(.*)*',
  name: 'not-found',
  component: () => import('./views/NotFoundView.vue'),
  meta: { seo: { title: 'Page not found', description: () => `That page is not on the ${c.brand} website.`, noindex: true } },
}
