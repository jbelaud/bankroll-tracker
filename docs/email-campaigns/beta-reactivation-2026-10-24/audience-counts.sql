-- LECTURE SEULE. Ne produit ni adresses e-mail ni file d'envoi.
-- Ces nombres ne prouvent pas l'éligibilité à la prospection.
select u.plan::text as plan,
       count(*)::int as accounts,
       count(*) filter (where a.email_confirmed_at is not null)::int as confirmed_emails,
       count(*) filter (where a.deleted_at is not null or
         (a.banned_until is not null and a.banned_until > now()))::int as deleted_or_banned,
       count(*) filter (where exists (
         select 1 from public.bankrolls b
         join public.bets bt on bt."bankrollId"=b.id
         where b."userId"=u.id
       ))::int as accounts_with_bets
from public.users u
left join auth.users a on a.id::text=u.id
group by u.plan
order by u.plan;
