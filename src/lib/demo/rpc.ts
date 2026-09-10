import type { DemoStore } from './dataset';

function km(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)) * 10) / 10;
}

export function demoRpc(name: string, p: any, s: DemoStore, uid: string): any {
  const prof = (id: string) => s.profiles.find((x) => x.id === id);
  const tprof = (id: string) => s.tutor_profiles.find((x) => x.profile_id === id);
  const subjName = (id: string | null) => s.subjects.find((x) => x.id === id)?.name ?? null;

  switch (name) {
    case 'platform_config': {
      const cfg = s.platform_settings[0];
      return [{ commission_rate: cfg.commission_rate, occasional_limit_cents: cfg.occasional_limit_cents, currency: cfg.currency }];
    }

    case 'search_tutors': {
      const me = prof(uid);
      const lat = p.p_lat ?? me?.location_lat ?? null;
      const lng = p.p_lng ?? me?.location_lng ?? null;
      return s.profiles
        .filter((pr) => pr.role === 'tutor' && pr.id !== uid && pr.onboarding_completed_at)
        .map((pr) => {
          const tp = tprof(pr.id);
          if (!tp || !tp.accepting_students) return null;
          if (p.p_school_context === 'high_school' && !tp.teaches_high_school) return null;
          if (p.p_school_context === 'university' && !tp.teaches_university) return null;
          if (p.p_mode === 'online' && !tp.delivery_online) return null;
          if (p.p_mode === 'in_person' && !tp.delivery_in_person) return null;
          const subs = s.tutor_subjects.filter(
            (ts) =>
              ts.tutor_id === pr.id &&
              (!p.p_school_context || ts.school_context === p.p_school_context),
          );
          if (p.p_subject_id && !subs.some((ts) => ts.subject_id === p.p_subject_id)) return null;
          if (
            p.p_course_id &&
            !s.tutor_courses.some((tc) => tc.tutor_id === pr.id && tc.course_id === p.p_course_id)
          )
            return null;
          if (
            p.p_query &&
            !`${pr.first_name} ${pr.last_name}`.toLowerCase().includes(String(p.p_query).toLowerCase())
          )
            return null;
          const dist =
            lat != null && pr.location_lat != null
              ? km(lat, lng, pr.location_lat, pr.location_lng)
              : null;
          if (
            p.p_mode !== 'online' &&
            dist != null &&
            dist > (p.p_radius_km ?? 30) &&
            !(p.p_mode === 'any' && tp.delivery_online)
          )
            return null;
          const names = Array.from(new Set(subs.map((ts) => subjName(ts.subject_id)).filter(Boolean)));
          return {
            id: pr.id,
            first_name: pr.first_name,
            last_name: pr.last_name,
            avatar_url: pr.avatar_url,
            location_label: pr.location_label,
            distance_km: dist,
            verified: tp.verified,
            bio: tp.bio,
            university_name: tp.university_name,
            degree_course: tp.degree_course,
            delivery_in_person: tp.delivery_in_person,
            delivery_online: tp.delivery_online,
            teaches_high_school: tp.teaches_high_school,
            teaches_university: tp.teaches_university,
            subjects: names,
          };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => Number(b.verified) - Number(a.verified) || (a.distance_km ?? 1e9) - (b.distance_km ?? 1e9));
    }

    case 'search_tutors_by_course': {
      const q = String(p.p_query ?? '').toLowerCase();
      const tutorIds = s.tutor_courses.filter((tc) => tc.course_id === p.p_course_id).map((tc) => tc.tutor_id);
      return s.profiles
        .filter((pr) => tutorIds.includes(pr.id) && pr.id !== uid)
        .filter((pr) => !q || `${pr.first_name} ${pr.last_name}`.toLowerCase().includes(q))
        .map((pr) => {
          const tp = tprof(pr.id)!;
          const names = Array.from(
            new Set(
              s.tutor_subjects.filter((ts) => ts.tutor_id === pr.id).map((ts) => subjName(ts.subject_id)).filter(Boolean),
            ),
          );
          return {
            id: pr.id,
            first_name: pr.first_name,
            last_name: pr.last_name,
            avatar_url: pr.avatar_url,
            location_label: pr.location_label,
            distance_km: null,
            verified: tp.verified,
            bio: tp.bio,
            university_name: tp.university_name,
            degree_course: tp.degree_course,
            delivery_in_person: tp.delivery_in_person,
            delivery_online: tp.delivery_online,
            teaches_high_school: tp.teaches_high_school,
            teaches_university: tp.teaches_university,
            subjects: names,
          };
        });
    }

    case 'get_tutor': {
      const pr = prof(p.p_id);
      const tp = pr && tprof(pr.id);
      if (!pr || !tp) return [];
      const subs = Array.from(
        new Set(s.tutor_subjects.filter((ts) => ts.tutor_id === pr.id).map((ts) => subjName(ts.subject_id)).filter(Boolean)),
      );
      const creds = s.tutor_credentials
        .filter((c) => c.tutor_id === pr.id && c.verification_status === 'verified')
        .map((c) => c.title + (c.institution ? ` — ${c.institution}` : ''));
      const courses = s.tutor_courses
        .filter((tc) => tc.tutor_id === pr.id)
        .map((tc) => {
          const c = s.courses.find((x) => x.id === tc.course_id);
          const prf = c && s.professors.find((x) => x.id === c.professor_id);
          return c ? `${c.name}${prf ? ` · ${prf.name}` : ''}` : null;
        })
        .filter(Boolean);
      const free = s.tutor_availability.filter(
        (a) =>
          a.tutor_id === pr.id &&
          new Date(a.ends_at).getTime() > Date.now() &&
          !s.bookings.some((b) => b.slot_id === a.id && ['pending', 'confirmed'].includes(b.status)),
      ).length;
      const rate = s.tutor_rates.find((r) => r.tutor_id === pr.id);
      return [
        {
          id: pr.id,
          first_name: pr.first_name,
          last_name: pr.last_name,
          avatar_url: pr.avatar_url,
          location_label: pr.location_label,
          verified: tp.verified,
          bio: tp.bio,
          university_name: tp.university_name,
          degree_course: tp.degree_course,
          delivery_in_person: tp.delivery_in_person,
          delivery_online: tp.delivery_online,
          teaches_high_school: tp.teaches_high_school,
          teaches_university: tp.teaches_university,
          accepting_students: tp.accepting_students,
          subjects: subs,
          credentials: creds,
          courses,
          free_slots: free,
          hourly_rate_cents: rate?.hourly_rate_cents ?? null,
        },
      ];
    }

    case 'get_tutor_slots': {
      return s.tutor_availability
        .filter((a) => a.tutor_id === p.p_tutor_id && new Date(a.ends_at).getTime() > Date.now())
        .map((a) => {
          const conf = s.bookings.some((b) => b.slot_id === a.id && b.status === 'confirmed');
          const pend = s.bookings.some((b) => b.slot_id === a.id && b.status === 'pending');
          const mine = s.bookings.some(
            (b) => b.slot_id === a.id && b.student_id === uid && ['pending', 'confirmed'].includes(b.status),
          );
          return {
            id: a.id,
            starts_at: a.starts_at,
            ends_at: a.ends_at,
            mode: a.mode,
            status: conf ? 'booked' : pend ? 'held' : 'free',
            mine,
          };
        })
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    }

    case 'my_bookings': {
      return s.bookings
        .filter((b) => b.student_id === uid || b.tutor_id === uid)
        .map((b) => {
          const cpId = b.student_id === uid ? b.tutor_id : b.student_id;
          const cp = prof(cpId);
          return {
            id: b.id,
            role: b.student_id === uid ? 'student' : 'tutor',
            status: b.status,
            mode: b.mode,
            starts_at: b.starts_at,
            ends_at: b.ends_at,
            is_emergency: b.is_emergency,
            message: b.message,
            tutor_note: b.tutor_note,
            subject_name: subjName(b.subject_id),
            price_cents: b.price_cents ?? null,
            commission_cents: b.commission_cents ?? null,
            counterpart_id: cpId,
            counterpart_first_name: cp?.first_name ?? '',
            counterpart_last_name: cp?.last_name ?? '',
            counterpart_avatar_url: cp?.avatar_url ?? null,
            created_at: b.created_at,
          };
        })
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    }

    case 'my_students': {
      return s.tutor_students
        .filter((ts) => ts.tutor_id === uid && ts.status === 'active')
        .map((ts) => {
          const pr = prof(ts.student_id);
          return {
            student_id: ts.student_id,
            first_name: pr?.first_name ?? '',
            last_name: pr?.last_name ?? '',
            avatar_url: pr?.avatar_url ?? null,
            location_label: pr?.location_label ?? null,
            since: ts.created_at,
            lessons_count: s.bookings.filter(
              (b) => b.tutor_id === uid && b.student_id === ts.student_id && ['confirmed', 'completed'].includes(b.status),
            ).length,
          };
        });
    }

    case 'my_tutors': {
      return s.tutor_students
        .filter((ts) => ts.student_id === uid && ts.status === 'active')
        .map((ts) => {
          const pr = prof(ts.tutor_id);
          return {
            tutor_id: ts.tutor_id,
            first_name: pr?.first_name ?? '',
            last_name: pr?.last_name ?? '',
            avatar_url: pr?.avatar_url ?? null,
            verified: tprof(ts.tutor_id)?.verified ?? false,
            since: ts.created_at,
          };
        });
    }

    case 'search_courses': {
      const q = String(p.p_query ?? '').toLowerCase();
      return s.courses
        .filter(
          (c) =>
            (!p.p_degree_course_id || c.degree_course_id === p.p_degree_course_id) &&
            (!q || c.name.toLowerCase().includes(q)),
        )
        .map((c) => {
          const dc = s.degree_courses.find((x) => x.id === c.degree_course_id);
          const uni = dc && s.universities.find((x) => x.id === dc.university_id);
          const prf = s.professors.find((x) => x.id === c.professor_id);
          return {
            id: c.id,
            name: c.name,
            year: c.year,
            degree_course_id: c.degree_course_id,
            degree_course_name: dc?.name ?? '',
            university_name: uni?.name ?? '',
            professor_name: prf?.name ?? '',
            subject_id: c.subject_id,
            tutors_count: s.tutor_courses.filter((tc) => tc.course_id === c.id).length,
          };
        });
    }

    case 'list_degree_courses': {
      return s.degree_courses.map((dc) => {
        const uni = s.universities.find((x) => x.id === dc.university_id);
        return { id: dc.id, name: dc.name, level: dc.level, university_name: uni?.name ?? '' };
      });
    }

    case 'my_conversations': {
      return s.conversations
        .filter((c) => c.tutor_id === uid || c.student_id === uid)
        .map((c) => {
          const cpId = c.tutor_id === uid ? c.student_id : c.tutor_id;
          const cp = prof(cpId);
          const msgs = s.messages.filter((m) => m.conversation_id === c.id).sort((a, b) => a.created_at.localeCompare(b.created_at));
          const last = msgs[msgs.length - 1];
          return {
            id: c.id,
            counterpart_id: cpId,
            counterpart_first_name: cp?.first_name ?? '',
            counterpart_last_name: cp?.last_name ?? '',
            counterpart_avatar_url: cp?.avatar_url ?? null,
            last_body: last?.body ?? '',
            last_at: last?.created_at ?? c.created_at,
            unread: msgs.filter((m) => m.sender_id !== uid && !m.read_at).length,
          };
        })
        .sort((a, b) => b.last_at.localeCompare(a.last_at));
    }

    case 'get_or_create_conversation': {
      const tutorId = p.p_tutor_id;
      const studentId = p.p_student_id ?? uid;
      let c = s.conversations.find((x) => x.tutor_id === tutorId && x.student_id === studentId);
      if (!c) {
        c = {
          id: `conv-${Date.now()}`,
          tutor_id: tutorId,
          student_id: studentId,
          last_message_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };
        s.conversations.push(c);
      }
      const cpId = c.tutor_id === uid ? c.student_id : c.tutor_id;
      const cp = prof(cpId);
      return [{ id: c.id, counterpart_first_name: cp?.first_name ?? '', counterpart_last_name: cp?.last_name ?? '', counterpart_avatar_url: cp?.avatar_url ?? null }];
    }

    case 'my_groups': {
      return s.study_groups
        .filter(
          (g) =>
            g.tutor_id === uid ||
            s.group_members.some((m) => m.group_id === g.id && m.student_id === uid && m.status === 'active'),
        )
        .map((g) => {
          const next = s.group_sessions
            .filter((se) => se.group_id === g.id && new Date(se.ends_at).getTime() > Date.now())
            .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
          return {
            id: g.id,
            name: g.name,
            subject_name: subjName(g.subject_id),
            is_owner: g.tutor_id === uid,
            members_count: s.group_members.filter((m) => m.group_id === g.id && m.status === 'active').length,
            next_session_at: next?.starts_at ?? null,
            next_session_topic: next?.topic ?? null,
          };
        });
    }

    case 'group_detail': {
      const g = s.study_groups.find((x) => x.id === p.p_id);
      if (!g) return [];
      const members = s.group_members
        .filter((m) => m.group_id === g.id && m.status === 'active')
        .map((m) => {
          const pr = prof(m.student_id);
          return {
            student_id: m.student_id,
            first_name: pr?.first_name ?? '',
            last_name: pr?.last_name ?? '',
            avatar_url: pr?.avatar_url ?? null,
            external: m.invited_external,
          };
        });
      const sessions = s.group_sessions
        .filter((se) => se.group_id === g.id)
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
      const tp = prof(g.tutor_id);
      return [
        {
          id: g.id,
          name: g.name,
          description: g.description,
          subject_name: subjName(g.subject_id),
          is_owner: g.tutor_id === uid,
          tutor_name: tp ? `${tp.first_name} ${tp.last_name}` : '',
          members,
          sessions,
        },
      ];
    }

    case 'my_notifications': {
      return s.notifications
        .filter((n) => n.user_id === uid)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    }

    case 'mark_notifications_read': {
      s.notifications.forEach((n) => {
        if (n.user_id === uid && !n.read_at) n.read_at = new Date().toISOString();
      });
      return null;
    }

    case 'tutor_earnings_summary': {
      const cfg = s.platform_settings[0];
      const year = new Date().getFullYear();
      const rows = s.tutor_earnings.filter(
        (e) => e.tutor_id === uid && new Date(e.occurred_at).getFullYear() === year,
      );
      const gross = rows.reduce((a, e) => a + e.gross_cents, 0);
      const net = rows.reduce((a, e) => a + e.net_cents, 0);
      const tp = tprof(uid);
      return [
        {
          ytd_gross_cents: gross,
          ytd_net_cents: net,
          lessons_count: rows.length,
          commission_rate: cfg.commission_rate,
          limit_cents: cfg.occasional_limit_cents,
          over_threshold: gross >= cfg.occasional_limit_cents,
          has_vat: !!tp?.partita_iva,
          fiscal_regime: tp?.fiscal_regime ?? 'occasional',
        },
      ];
    }

    case 'open_emergencies': {
      // richieste aperte non mie, rivolte ai tutor (broadcast) o a me come tutor
      return s.emergency_requests
        .filter(
          (e) =>
            e.status === 'open' &&
            e.student_id !== uid &&
            (e.broadcast || e.target_tutor_id === uid) &&
            !s.emergency_offers.some((o) => o.request_id === e.id && o.tutor_id === uid),
        )
        .map((e) => {
          const st = prof(e.student_id);
          return {
            id: e.id,
            student_name: st ? `${st.first_name} ${st.last_name}` : '',
            subject_name: subjName(e.subject_id),
            note: e.note,
            mode: e.mode,
            when_pref: e.when_pref,
            created_at: e.created_at,
          };
        });
    }

    case 'my_emergencies': {
      return s.emergency_requests
        .filter(
          (e) =>
            e.student_id === uid ||
            s.emergency_offers.some((o) => o.request_id === e.id && o.tutor_id === uid),
        )
        .map((e) => {
          const offers = s.emergency_offers
            .filter((o) => o.request_id === e.id)
            .map((o) => {
              const t = prof(o.tutor_id);
              return {
                id: o.id,
                tutor_id: o.tutor_id,
                tutor_name: t ? `${t.first_name} ${t.last_name}` : '',
                proposed_at: o.proposed_at,
                status: o.status,
              };
            });
          return {
            id: e.id,
            role: e.student_id === uid ? 'student' : 'tutor',
            status: e.status,
            subject_name: subjName(e.subject_id),
            note: e.note,
            mode: e.mode,
            when_pref: e.when_pref,
            created_at: e.created_at,
            offers,
          };
        });
    }

    /* --------------------------- F10 — Pannello admin --------------------------- */
    case 'admin_overview': {
      const paid = s.bookings.filter((b) => ['confirmed', 'completed'].includes(b.status));
      return [
        {
          users_total: s.profiles.length,
          students_total: s.profiles.filter((x) => x.role === 'student').length,
          tutors_total: s.profiles.filter((x) => x.role === 'tutor').length,
          tutors_verified: s.tutor_profiles.filter((x) => x.verified).length,
          tutors_pending: s.tutor_profiles.filter((x) => !x.verified).length,
          credentials_pending: s.tutor_credentials.filter((c) => c.verification_status === 'requested').length,
          bookings_total: s.bookings.length,
          bookings_upcoming: s.bookings.filter(
            (b) => b.status === 'confirmed' && new Date(b.ends_at).getTime() > Date.now(),
          ).length,
          gmv_cents: paid.reduce((a, b) => a + (b.price_cents ?? 0), 0),
          commission_cents: paid.reduce((a, b) => a + (b.commission_cents ?? 0), 0),
          emergencies_open: s.emergency_requests.filter((e) => e.status === 'open').length,
          groups_total: s.study_groups.length,
        },
      ];
    }

    case 'admin_pending_credentials': {
      return s.tutor_credentials
        .filter((c) => c.verification_status === 'requested')
        .map((c) => {
          const pr = prof(c.tutor_id);
          return {
            id: c.id,
            tutor_id: c.tutor_id,
            tutor_name: pr ? `${pr.first_name} ${pr.last_name}`.trim() : '',
            tutor_avatar_url: pr?.avatar_url ?? null,
            tutor_verified: tprof(c.tutor_id)?.verified ?? false,
            title: c.title,
            institution: c.institution,
            year: c.year ?? null,
            document_url: c.document_url ?? null,
            requested_at: c.requested_at ?? c.created_at,
          };
        })
        .sort((a, b) => String(a.requested_at).localeCompare(String(b.requested_at)));
    }

    case 'admin_review_credential': {
      const c = s.tutor_credentials.find((x) => x.id === p.p_id);
      if (!c) return null;
      c.verification_status = p.p_approve ? 'verified' : 'rejected';
      c.reviewed_at = new Date().toISOString();
      c.reviewer_note = p.p_note ?? '';
      if (p.p_approve) {
        const tp = tprof(c.tutor_id);
        if (tp) tp.verified = true;
      }
      s.notifications.push({
        id: `n-${Date.now()}`,
        user_id: c.tutor_id,
        kind: p.p_approve ? 'credential_verified' : 'credential_rejected',
        title: p.p_approve ? 'Titolo verificato' : 'Titolo non verificato',
        body: p.p_approve
          ? `"${c.title}" è stato verificato.`
          : `La verifica di "${c.title}" non è andata a buon fine.`,
        link: '/(app)/profilo',
        read_at: null,
        created_at: new Date().toISOString(),
      });
      return null;
    }

    case 'admin_set_tutor_verified': {
      const tp = tprof(p.p_tutor_id);
      if (tp) tp.verified = !!p.p_verified;
      s.notifications.push({
        id: `n-${Date.now()}`,
        user_id: p.p_tutor_id,
        kind: p.p_verified ? 'tutor_verified' : 'tutor_unverified',
        title: p.p_verified ? 'Profilo verificato' : 'Verifica revocata',
        body: p.p_verified
          ? 'Un amministratore ha verificato il tuo profilo.'
          : 'Lo stato "verificato" del tuo profilo è stato revocato.',
        link: '/(app)/profilo',
        read_at: null,
        created_at: new Date().toISOString(),
      });
      return null;
    }

    case 'admin_list_users': {
      const q = String(p.p_query ?? '').toLowerCase();
      const role = p.p_role ?? 'all';
      return s.profiles
        .filter((pr) => role === 'all' || pr.role === role)
        .filter((pr) => {
          if (!q) return true;
          const name = `${pr.first_name} ${pr.last_name}`.toLowerCase();
          return name.includes(q) || String(pr.location_label ?? '').toLowerCase().includes(q);
        })
        .map((pr) => ({
          id: pr.id,
          first_name: pr.first_name,
          last_name: pr.last_name,
          avatar_url: pr.avatar_url ?? null,
          role: pr.role,
          is_admin: !!pr.is_admin,
          verified: tprof(pr.id)?.verified ?? false,
          location_label: pr.location_label ?? null,
          onboarding_completed: !!pr.onboarding_completed_at,
          created_at: pr.created_at,
        }))
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    }

    default:
      return [];
  }
}
