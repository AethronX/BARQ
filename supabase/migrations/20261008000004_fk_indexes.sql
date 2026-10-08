-- Cover foreign keys flagged by the performance advisor.
create index if not exists orders_created_by_idx on public.orders (created_by);
create index if not exists quotes_submitted_by_idx on public.quotes (submitted_by);
