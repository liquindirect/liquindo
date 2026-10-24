-- Store the editable homepage Message from Liquin copy in site settings.
insert into public.site_settings(setting_key,setting_value)
values ('message_from_liquin', jsonb_build_object('text','Visit the Liquindo shop for official merchandise.','url','https://liquindomerch.printify.me/products'))
on conflict (setting_key) do nothing;
