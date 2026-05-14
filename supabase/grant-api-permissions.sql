grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.watchlist to authenticated;
grant select, insert on public.analysis_reports to authenticated;
grant select, insert on public.usage_events to authenticated;
grant select, insert, update on public.subscriptions to authenticated;
grant select, insert, update on public.usage_counters to authenticated;
grant select on public.market_cache to authenticated;
