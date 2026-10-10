UPDATE pc_franchises SET previous_doc=doc,
 doc=json_set(doc,'$.credits',json_extract(doc,'$.credits')+200000,'$.tokens',json_extract(doc,'$.tokens')+100,'$.welcomeGrant20261010',json('true'),'$.unlimitedTokens',json('false')),
 revision=revision+1,updated=MAX(updated+1,CAST(strftime('%s','now') AS INTEGER)*1000)
 WHERE COALESCE(json_extract(doc,'$.welcomeGrant20261010'),0)<>1;
