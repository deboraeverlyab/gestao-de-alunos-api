import request from 'supertest';
import { expect } from 'chai';
import { readFileSync } from 'node:fs';
import app from '../src/app.js';
import { loginAdmin, loginAluno } from './helpers/login.js';

const dados = JSON.parse(readFileSync(new URL('./fixtures/trabalhos.json', import.meta.url)));

dados.forEach((dado) => {
  describe(`Entrega de trabalho - ${dado.aluno.nome}`, () => {
    const id = Date.now();
    const aluno = {
      ...dado.aluno,
      email: `${id}.${dado.aluno.email}`,
      matricula: `${dado.aluno.matricula}-${id}`,
    };

    let tokenAdmin;
    let tokenAluno;
    let alunoId;

    it('deve logar como administrador', async () => {
      tokenAdmin = await loginAdmin();

      expect(tokenAdmin).to.be.a('string');
    });

    it('deve cadastrar um aluno', async () => {
      const resposta = await request(app)
        .post('/api/admin/alunos')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(aluno);

      expect(resposta.status).to.equal(201);
      expect(resposta.body.email).to.equal(aluno.email);
      expect(resposta.body).to.not.have.property('senha');

      alunoId = resposta.body.id;
    });

    it('deve matricular o aluno na disciplina', async () => {
      const resposta = await request(app)
        .post(`/api/admin/disciplinas/${dado.disciplinaId}/matriculas`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ alunoId });

      expect(resposta.status).to.equal(201);
    });

    it('deve logar como aluno', async () => {
      tokenAluno = await loginAluno(aluno.email, aluno.senha);

      expect(tokenAluno).to.be.a('string');
    });

    it('deve registrar a entrega de um trabalho', async () => {
      const resposta = await request(app)
        .post(`/api/alunos/${alunoId}/trabalhos`)
        .set('Authorization', `Bearer ${tokenAluno}`)
        .send({ disciplinaId: dado.disciplinaId, ...dado.trabalho });

      expect(resposta.status).to.equal(201);
      expect(resposta.body.alunoId).to.equal(alunoId);
      expect(resposta.body.titulo).to.equal(dado.trabalho.titulo);
      expect(resposta.body.status).to.equal('entregue');
    });
  });
});
